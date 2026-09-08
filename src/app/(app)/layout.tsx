import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SignOutButton } from "@/components/ui/SignOutButton";

/**
 * Shell for every approved-user page. Trip pages render their own top bar,
 * so this one stays thin.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireApproved();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-line bg-surface">
        <Link href="/trips" className="font-display font-bold text-lg tracking-tight">
          {t.app.name}
        </Link>
        <nav className="flex items-center gap-1 ml-2 text-sm">
          <Link href="/trips" className="btn ghost sm">
            {t.nav.trips}
          </Link>
          {profile.is_admin ? (
            <Link href="/admin/users" className="btn ghost sm">
              {t.nav.admin}
            </Link>
          ) : null}
        </nav>
        <div className="flex-1" />
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
        ) : null}
        <SignOutButton />
      </header>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
