import { t } from "@/lib/i18n";

/** Plain form POST so it works without JavaScript. */
export function SignOutButton({ className = "btn ghost sm" }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button className={className} type="submit">
        {t.auth.signOut}
      </button>
    </form>
  );
}
