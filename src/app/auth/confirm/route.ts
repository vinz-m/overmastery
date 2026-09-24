import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Only same-site paths: never let the link send someone to another origin. */
function safeNext(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : "/";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation credentials") };

  if (!result.error) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const failed = new URL("/login", request.url);
  failed.searchParams.set(
    "authError",
    next === "/reset-password" ? "reset" : "confirmation",
  );
  return NextResponse.redirect(failed);
}
