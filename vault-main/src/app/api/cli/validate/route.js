import { NextResponse } from "next/server";
import { verifyCliToken } from "@/lib/cli-auth";

// POST /api/cli/validate
// Used by the CLI login command.
// Accepts a plaintext CLI token and verifies:
// - token format
// - token hash exists in Supabase
// - token is not revoked
// - user has active Pro subscription
// - subscription has not expired
export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        valid: false,
        reason: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const token = body.token;

  const verification = await verifyCliToken(token);

  if (!verification.valid) {
    return NextResponse.json(
      {
        valid: false,
        reason: verification.reason,
      },
      { status: verification.status || 400 }
    );
  }

  return NextResponse.json({
    valid: true,
  });
}