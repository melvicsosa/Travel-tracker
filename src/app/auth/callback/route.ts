import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth landing: exchanges the code for a session cookie, then redirects. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/trips";

  // Supabase forwards provider errors as query params instead of a code.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only allow relative redirects to avoid open-redirect abuse.
      const safeNext = next.startsWith("/") ? next : "/trips";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    return NextResponse.redirect(`${origin}/login?error=oauth&reason=${encodeURIComponent(error.message)}`);
  }

  const reason = providerError ?? "missing_code";
  return NextResponse.redirect(`${origin}/login?error=oauth&reason=${encodeURIComponent(reason)}`);
}
