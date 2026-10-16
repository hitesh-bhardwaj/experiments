import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const update = vi.fn();
const create = vi.fn();
const listSegments = vi.fn();
const addSegment = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    this.contacts = { get, update, create, segments: { list: listSegments, add: addSegment } };
  }),
}));

const SEGMENT = "d2ba4cd4-0112-430f-94e1-38b170d1b9b3";

let session = { userId: "user_1" };
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => session),
  currentUser: vi.fn(async () => ({ primaryEmailAddress: { emailAddress: "Me@Studio.com" } })),
}));

const { GET, POST } = await import("./route.js");

const post = (body) => POST(new Request("http://localhost/api/user/email-preferences", { method: "POST", body: JSON.stringify(body) }));
const notFound = { data: null, error: { name: "not_found", message: "Contact not found" } };

describe("/api/user/email-preferences (the Product updates toggle)", () => {
  beforeEach(() => {
    session = { userId: "user_1" };
    for (const fn of [get, update, create, listSegments, addSegment]) fn.mockReset();
    update.mockResolvedValue({ error: null });
    create.mockResolvedValue({ error: null });
    listSegments.mockResolvedValue({ data: { data: [] }, error: null });
    addSegment.mockResolvedValue({ data: { id: SEGMENT }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("needs a session", async () => {
    session = { userId: null };
    expect((await GET()).status).toBe(401);
    expect((await post({ productUpdates: true })).status).toBe(401);
  });

  it("reads on for a subscribed contact, off for an unsubscribed or missing one", async () => {
    get.mockResolvedValueOnce({ data: { unsubscribed: false }, error: null });
    expect(await (await GET()).json()).toEqual({ productUpdates: true });
    get.mockResolvedValueOnce({ data: { unsubscribed: true }, error: null });
    expect(await (await GET()).json()).toEqual({ productUpdates: false });
    get.mockResolvedValueOnce(notFound);
    expect(await (await GET()).json()).toEqual({ productUpdates: false });
    expect(get).toHaveBeenCalledWith({ email: "me@studio.com" });
  });

  it("reports a real Resend failure instead of reading it as off", async () => {
    get.mockResolvedValueOnce({ data: null, error: { name: "restricted_api_key", message: "no" } });
    expect((await GET()).status).toBe(502);
  });

  it("a first-time switch creates the contact in the Product Updates segment, on or off", async () => {
    get.mockResolvedValueOnce(notFound);
    expect(await (await post({ productUpdates: true })).json()).toEqual({ productUpdates: true });
    expect(create).toHaveBeenLastCalledWith({ email: "me@studio.com", unsubscribed: false, segments: [{ id: SEGMENT }] });

    get.mockResolvedValueOnce(notFound);
    await post({ productUpdates: false });
    expect(create).toHaveBeenLastCalledWith({ email: "me@studio.com", unsubscribed: true, segments: [{ id: SEGMENT }] });
  });

  it("turning off unsubscribes an existing contact and keeps it in the segment", async () => {
    get.mockResolvedValueOnce({ data: { unsubscribed: false }, error: null });
    listSegments.mockResolvedValueOnce({ data: { data: [{ id: SEGMENT }] }, error: null });
    expect(await (await post({ productUpdates: false })).json()).toEqual({ productUpdates: false });
    expect(update).toHaveBeenCalledWith({ email: "me@studio.com", unsubscribed: true });
    expect(addSegment).not.toHaveBeenCalled();
  });

  it("an existing contact outside the segment (e.g. the footer signup) is added to it", async () => {
    get.mockResolvedValueOnce({ data: { unsubscribed: true }, error: null });
    await post({ productUpdates: true });
    expect(update).toHaveBeenCalledWith({ email: "me@studio.com", unsubscribed: false });
    expect(addSegment).toHaveBeenCalledWith({ email: "me@studio.com", segmentId: SEGMENT });
  });

  it("a failed segment write is reported", async () => {
    get.mockResolvedValueOnce({ data: { unsubscribed: false }, error: null });
    addSegment.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "bad" } });
    expect((await post({ productUpdates: true })).status).toBe(502);
  });

  it("rejects anything but true or false", async () => {
    expect((await post({ productUpdates: "yes" })).status).toBe(400);
  });
});
