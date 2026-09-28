import { describe, it, expect, vi, beforeEach } from "vitest";

let rpcMock;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return { rpc: rpcMock };
  },
}));

const { claimFoundingSlot, confirmFoundingSlot, releaseFoundingSlot } = await import(
  "./founding-slots.js"
);

const RESERVATION_ROW = {
  id: "res-1",
  clerk_user_id: "user_1",
  status: "reserved",
};

describe("founding-slots RPC wrappers", () => {
  beforeEach(() => {
    rpcMock = vi.fn();
  });

  it("claimFoundingSlot calls claim_founding_slot with the right args and unwraps the first row", async () => {
    rpcMock.mockResolvedValue({ data: [RESERVATION_ROW], error: null });

    const result = await claimFoundingSlot({
      clerkUserId: "user_1",
      idempotencyKey: "key_1",
      currency: "USD",
    });

    expect(rpcMock).toHaveBeenCalledWith("claim_founding_slot", {
      p_clerk_user_id: "user_1",
      p_idempotency_key: "key_1",
      p_currency: "USD",
      p_ttl_seconds: 900,
    });
    expect(result).toEqual(RESERVATION_ROW);
  });

  it("claimFoundingSlot returns null when the pool is full (empty row set)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const result = await claimFoundingSlot({
      clerkUserId: "user_1",
      idempotencyKey: "key_1",
      currency: "USD",
    });

    expect(result).toBeNull();
  });

  it("claimFoundingSlot throws and logs on a Supabase error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("connection reset") });

    await expect(
      claimFoundingSlot({ clerkUserId: "user_1", idempotencyKey: "key_1", currency: "USD" })
    ).rejects.toThrow("connection reset");
  });

  it("confirmFoundingSlot calls confirm_founding_slot with the right args", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...RESERVATION_ROW, status: "confirmed" }], error: null });

    const result = await confirmFoundingSlot({
      reservationId: "res-1",
      razorpaySubscriptionId: "sub_abc",
    });

    expect(rpcMock).toHaveBeenCalledWith("confirm_founding_slot", {
      p_reservation_id: "res-1",
      p_razorpay_subscription_id: "sub_abc",
    });
    expect(result.status).toBe("confirmed");
  });

  it("releaseFoundingSlot calls release_founding_slot with the right args", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...RESERVATION_ROW, status: "released" }], error: null });

    const result = await releaseFoundingSlot({ reservationId: "res-1", reason: "razorpay_create_failed" });

    expect(rpcMock).toHaveBeenCalledWith("release_founding_slot", {
      p_reservation_id: "res-1",
      p_reason: "razorpay_create_failed",
    });
    expect(result.status).toBe("released");
  });

  it("releaseFoundingSlot returns null when the reservation was already confirmed (no-op)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const result = await releaseFoundingSlot({ reservationId: "res-1", reason: "subscription.cancelled" });

    expect(result).toBeNull();
  });
});
