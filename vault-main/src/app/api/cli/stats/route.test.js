import { describe, it, expect, vi, beforeEach } from "vitest";

const eqMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: (...args) => eqMock(...args) }),
    }),
  },
}));

const { GET } = await import("./route.js");

function makeRequest(query) {
  return new Request(`http://localhost/api/cli/stats${query}`);
}

describe("GET /api/cli/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400s with no query params", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns installCount for a single effect", async () => {
    eqMock.mockResolvedValue({ count: 42, error: null });
    const res = await GET(makeRequest("?effect=blur-text"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ effect: "blur-text", installCount: 42 });
    expect(eqMock).toHaveBeenCalledWith("effect", "blur-text");
  });

  it("returns 0 for an effect with no installs on record", async () => {
    eqMock.mockResolvedValue({ count: 0, error: null });
    const res = await GET(makeRequest("?effect=brand-new-effect"));
    const body = await res.json();
    expect(body.installCount).toBe(0);
  });

  it("500s when the count query fails", async () => {
    eqMock.mockResolvedValue({ count: null, error: { message: "db down" } });
    const res = await GET(makeRequest("?effect=blur-text"));
    expect(res.status).toBe(500);
  });

  it("returns a stats array for a batch of effects, deduping and capping input", async () => {
    eqMock.mockResolvedValue({ count: 5, error: null });
    const res = await GET(makeRequest("?effects=blur-text,grid-scale,blur-text"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stats).toEqual([
      { effect: "blur-text", installCount: 5 },
      { effect: "grid-scale", installCount: 5 },
    ]);
  });
});
