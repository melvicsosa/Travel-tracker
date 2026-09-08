import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import type { Profile } from "@/lib/database.types";
import { setUserStatus } from "./actions";

export const metadata = { title: t.admin.users };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const users = (data ?? []) as Profile[];
  const pending = users.filter((u) => u.status === "pending");

  return (
    <main className="w-full max-w-[1080px] mx-auto p-4 sm:p-8 flex flex-col gap-6">
      <h1 className="text-2xl">{t.admin.users}</h1>

      <section className="flex flex-col gap-2">
        <span className="lbl">{t.admin.pendingUsers}</span>
        {pending.length === 0 ? (
          <p className="text-ink-3 text-sm">{t.admin.noPending}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((u) => (
              <UserRow key={u.id} user={u} isMe={u.id === me.id} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <span className="lbl">{t.admin.allUsers}</span>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} isMe={u.id === me.id} />
          ))}
        </ul>
      </section>
    </main>
  );
}

function UserRow({ user, isMe }: { user: Profile; isMe: boolean }) {
  const statusColor =
    user.status === "approved" ? "text-teal" : user.status === "rejected" ? "text-hibiscus" : "text-citrus";

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="av" style={{ background: "var(--ink-3)" }}>
          {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">
          {user.full_name ?? user.email}
          {user.is_admin ? <span className="ml-2 text-xs text-ink-3 uppercase tracking-wide">{t.admin.admin}</span> : null}
        </div>
        <div className="text-ink-3 text-xs truncate mono">{user.email}</div>
      </div>
      <span className={`text-xs font-bold uppercase tracking-wide ${statusColor}`}>{t.admin.status[user.status]}</span>
      {!isMe ? (
        <div className="flex gap-2">
          {user.status !== "approved" ? (
            <form action={setUserStatus}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="status" value="approved" />
              <button className="btn sm primary">{t.admin.approve}</button>
            </form>
          ) : null}
          {user.status !== "rejected" ? (
            <form action={setUserStatus}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="btn sm danger">{user.status === "approved" ? t.admin.revoke : t.admin.reject}</button>
            </form>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
