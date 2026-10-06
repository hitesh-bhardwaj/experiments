import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      cli_token_hash: null,
      cli_token_revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId);

  if (error) {
    console.error("CLI_TOKEN_REVOKE_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to revoke CLI token." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "CLI token revoked successfully.",
  });
}