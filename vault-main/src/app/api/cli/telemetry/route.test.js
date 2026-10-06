import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const upsertMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table) => {
      if (table === "cli_effect_installs") {
        return { upsert: (...args) => upsertMock(...args) };
      }
      return { insert: (...args) => insertMock(...args) };
    },
  },
}));

const { POST } = await import("./route.js");

function makeRequest(body) {
  return new Request("http://localhost/api/cli/telemetry", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_EVENT = {
  event: "add",
  anonymousId: "abc123",
  cliVersion: "1.1.0-beta.0",
  platform: "darwin",
  nodeVersion: "22.12.0",
  properties: { effect: "blur-text" },
  timestamp: "2026-08-04T07:56:24.878Z",
};

describe("POST /api/cli/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
    upsertMock.mockResolvedValue({ error: null });
  });

  it("204s and inserts a well-formed event", async () => {
    const res = await POST(makeRequest(VALID_EVENT));
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "add",
        anonymous_id: "abc123",
        cli_version: "1.1.0-beta.0",
        properties: { effect: "blur-text" },
      })
    );
  });

  it("upserts a dedup row into cli_effect_installs for an `add` event", async () => {
    const res = await POST(
      makeRequest({
        ...VALID_EVENT,
        properties: { effect: "blur-text", framework: "next", router: "app", packageManager: "pnpm" },
      })
    );
    expect(res.status).toBe(204);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymous_id: "abc123",
        effect: "blur-text",
        framework: "next",
        router: "app",
        package_manager: "pnpm",
      }),
      { onConflict: "anonymous_id,effect" }
    );
  });

  it("does not upsert a dedup row for an `init` event (no effect)", async () => {
    const res = await POST(makeRequest({ ...VALID_EVENT, event: "init", properties: {} }));
    expect(res.status).toBe(204);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("still 204s if the dedup upsert fails - the raw event is already persisted", async () => {
    upsertMock.mockResolvedValue({ error: { message: "constraint violation" } });
    const res = await POST(makeRequest(VALID_EVENT));
    expect(res.status).toBe(204);
  });

  it("400s on invalid JSON", async () => {
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("400s on an unknown event name", async () => {
    const res = await POST(makeRequest({ ...VALID_EVENT, event: "delete-everything" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("400s when anonymousId is missing", async () => {
    const res = await POST(makeRequest({ ...VALID_EVENT, anonymousId: undefined }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("drops non-object properties instead of failing", async () => {
    const res = await POST(makeRequest({ ...VALID_EVENT, properties: "not-an-object" }));
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ properties: {} })
    );
  });

  it("400s when the properties payload is too large", async () => {
    const properties = { blob: "x".repeat(5000) };
    const res = await POST(makeRequest({ ...VALID_EVENT, properties }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("500s when the insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(makeRequest(VALID_EVENT));
    expect(res.status).toBe(500);
  });
});
