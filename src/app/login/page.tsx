import { t } from "@/lib/i18n";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const { next, error, reason } = await searchParams;

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="lbl">{t.app.name}</span>
          <h1 className="text-3xl">{t.app.tagline}</h1>
          <p className="text-ink-2 text-sm">{t.auth.loginIntro}</p>
        </div>
        <GoogleSignInButton next={next} />
        {error ? (
          <div className="text-hibiscus text-sm flex flex-col gap-1">
            <p>{t.auth.error}</p>
            {reason ? <p className="mono text-xs opacity-80 break-words">{reason}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
