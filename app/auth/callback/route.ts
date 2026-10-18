import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

// Confirmation and password-reset emails link here with a one-time code. Swap it for a session.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
