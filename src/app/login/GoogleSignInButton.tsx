"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setBusy(false);
  }

  return (
    <button className="btn primary block" onClick={signIn} disabled={busy}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.27Z" opacity=".9"/>
        <path fill="currentColor" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.58A10 10 0 0 0 12 22Z" opacity=".7"/>
        <path fill="currentColor" d="M6.41 13.94A6 6 0 0 1 6.1 12c0-.67.11-1.33.31-1.94V7.48H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.34-2.58Z" opacity=".5"/>
        <path fill="currentColor" d="M12 5.96c1.47 0 2.78.5 3.82 1.5l2.86-2.87A10 10 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.58C7.2 7.71 9.4 5.96 12 5.96Z" opacity=".8"/>
      </svg>
      {busy ? t.common.loading : t.auth.signInWithGoogle}
    </button>
  );
}
