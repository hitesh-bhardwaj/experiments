import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const addToSegment = vi.fn();
const listSegments = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    this.contacts = { create, update, segments: { add: addToSegment, list: listSegments } };
  }),
}));

const { POST } = await import("./route.js");

const SEGMENT = "seg_community";
const post = (body) =>
  POST(new Request("http://localhost/api/community/waitlist", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

describe("POST /api/community/waitlist", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ error: null });
    update.mockReset().mockResolvedValue({ error: null });
    addToSegment.mockReset().mockResolvedValue({ error: null });
    listSegments.mockReset().mockResolvedValue({ data: { data: [] } });
    process.env.RESEND_COMMUNITY_SEGMENT_ID = SEGMENT;
    delete process.env.RESEND_COMMUNITY_STACK_PROPERTY;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects a missing, malformed or unparseable email with a 400", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ email: "nope" })).status).toBe(400);
    expect((await post("{email:")).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("fails gracefully when the segment isn't configured", async () => {
    delete process.env.RESEND_COMMUNITY_SEGMENT_ID;
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the normalised email straight into the waitlist segment", async () => {
    const res = await post({ email: "  Me@Studio.COM ", stack: ["React"] });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({ email: "me@studio.com", unsubscribed: false, segments: [{ id: SEGMENT }] });
    expect(addToSegment).not.toHaveBeenCalled();
  });

  it("adds an existing contact (e.g. a newsletter subscriber) to the segment", async () => {
    create.mockResolvedValue({ error: { name: "validation_error", message: "Contact already exists" } });
    const res = await post({ email: "reader@studio.com" });
    expect(res.status).toBe(200);
    expect(addToSegment).toHaveBeenCalledWith({ email: "reader@studio.com", segmentId: SEGMENT });
  });

  it("treats someone already on the waitlist as a success", async () => {
    create.mockResolvedValue({ error: { message: "Contact already exists" } });
    addToSegment.mockResolvedValue({ error: { message: "Contact already in segment" } });
    listSegments.mockResolvedValue({ data: { data: [{ id: SEGMENT, name: "Community Waitlist" }] } });
    expect((await post({ email: "again@studio.com" })).status).toBe(200);
  });

  it("writes only known stacks to the configured property, for new and existing contacts", async () => {
    process.env.RESEND_COMMUNITY_STACK_PROPERTY = "stack";
    await post({ email: "a@b.co", stack: ["GSAP", "<script>", "React"] });
    expect(create.mock.calls[0][0].properties).toEqual({ stack: "React, GSAP" });

    create.mockResolvedValue({ error: { message: "Contact already exists" } });
    await post({ email: "c@d.co", stack: ["Vue"] });
    expect(update).toHaveBeenCalledWith({ email: "c@d.co", properties: { stack: "Vue" } });
  });

  it("reports a provider failure as a 500", async () => {
    create.mockResolvedValue({ error: { message: "boom" } });
    addToSegment.mockResolvedValue({ error: { message: "boom" } });
    expect((await post({ email: "a@b.co" })).status).toBe(500);
  });
});
