import { requireApproved } from "@/lib/auth";
import { AppNav } from "@/components/ui/AppNav";

/** Shell for every approved-user page. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireApproved();

  return (
    <div className="h-dvh flex flex-col">
      <AppNav isAdmin={profile.is_admin} avatarUrl={profile.avatar_url} />
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
