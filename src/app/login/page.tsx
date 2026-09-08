import { t } from "@/lib/i18n";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="lbl">{t.app.name}</span>
          <h1 className="text-3xl">{t.app.tagline}</h1>
          <p className="text-ink-2 text-sm">{t.auth.loginIntro}</p>
        </div>
        <GoogleSignInButton next={next} />
        {error ? <p className="text-hibiscus text-sm">{t.auth.error}</p> : null}
      </div>
    </main>
  );
}
