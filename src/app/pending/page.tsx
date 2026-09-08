import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SignOutButton } from "@/components/ui/SignOutButton";

export const metadata = { title: t.pending.title };

export default async function PendingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/trips");

  const rejected = profile.status === "rejected";

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-5 text-center">
        <span className="lbl">{t.app.name}</span>
        <h1 className="text-2xl">{rejected ? t.pending.rejectedTitle : t.pending.title}</h1>
        <p className="text-ink-2 text-sm">{rejected ? t.pending.rejectedBody : t.pending.body}</p>
        <p className="text-ink-3 text-xs mono">{profile.email}</p>
        <div className="flex flex-col gap-2">
          {!rejected ? (
            <a className="btn primary block" href="/pending">
              {t.pending.refresh}
            </a>
          ) : null}
          <SignOutButton className="btn ghost block" />
        </div>
      </div>
    </main>
  );
}
