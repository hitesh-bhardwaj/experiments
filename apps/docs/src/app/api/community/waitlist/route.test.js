import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() { this.contacts = { create }; }),
}));

const { POST } = await import("./route.js");

const post = (body) =>
  POST(new Request("http://localhost/api/community/waitlist", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/community/waitlist", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ error: null });
    process.env.RESEND_COMMUNITY_AUDIENCE_ID = "aud_123";
    delete process.env.RESEND_COMMUNITY_STACK_PROPERTY;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects a missing or malformed email", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ email: "nope" })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("fails gracefully when the audience isn't configured", async () => {
    delete process.env.RESEND_COMMUNITY_AUDIENCE_ID;
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("adds the normalised email to the audience", async () => {
    const res = await post({ email: "  Me@Studio.COM ", stack: ["React"] });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({ email: "me@studio.com", audienceId: "aud_123", unsubscribed: false });
  });

  it("writes only known stacks to the configured property", async () => {
    process.env.RESEND_COMMUNITY_STACK_PROPERTY = "stack";
    await post({ email: "a@b.co", stack: ["GSAP", "<script>", "React"] });
    expect(create.mock.calls[0][0].properties).toEqual({ stack: "React, GSAP" });
  });

  it("reports a provider error as a 500", async () => {
    create.mockResolvedValue({ error: { message: "boom" } });
    expect((await post({ email: "a@b.co" })).status).toBe(500);
  });
});
