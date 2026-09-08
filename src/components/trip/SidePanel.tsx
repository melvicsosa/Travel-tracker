"use client";

import { useState } from "react";
import type { Activity, Traveler, TripMemberWithProfile, TripRole } from "@/lib/database.types";
import { TRAVELER_COLORS, initials } from "@/lib/categories";
import { t } from "@/lib/i18n";
import { formatTime, fromYMD, weekdayShort } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { PlusIcon } from "@/components/ui/Icons";

export function SidePanel({
  tripId,
  travelers,
  activities,
  members,
  filterTraveler,
  canEdit,
  isOwner,
  onFilter,
  onAddTraveler,
  onRemoveTraveler,
  onOpenActivity,
  onInvite,
  onRemoveMember,
}: {
  tripId: string;
  travelers: Traveler[];
  activities: Activity[];
  members: TripMemberWithProfile[];
  filterTraveler: string | null;
  canEdit: boolean;
  isOwner: boolean;
  onFilter: (id: string | null) => void;
  onAddTraveler: (p: Traveler) => void;
  onRemoveTraveler: (id: string) => void;
  onOpenActivity: (a: Activity) => void;
  onInvite: (email: string, role: TripRole) => Promise<string | null>;
  onRemoveMember: (userId: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const reservations = activities
    .filter((a) => a.booking !== "none")
    .sort((x, y) => x.date.localeCompare(y.date) || x.start_min - y.start_min);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="lbl">{t.travelers.title}</span>
          {canEdit ? (
            <button className="btn sm ghost -mr-2" onClick={() => setAddOpen(true)}>
              <PlusIcon />
              {t.travelers.add}
            </button>
          ) : null}
        </div>
        {travelers.length === 0 ? (
          <p className="text-xs text-ink-3">{t.travelers.empty}</p>
        ) : (
          travelers.map((p) => {
            const n = activities.filter((a) => a.traveler_ids.includes(p.id)).length;
            return (
              <div key={p.id} className="flex items-center gap-1">
                <button className={`rowbtn${filterTraveler === p.id ? " on" : ""}`}
                  onClick={() => onFilter(filterTraveler === p.id ? null : p.id)}>
                  <Avatar short={p.short_name} color={p.color} />
                  <span className="text-sm font-semibold truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-ink-3 mono">{n}</span>
                </button>
                {canEdit ? (
                  <button className="btn sm ghost" style={{ color: "var(--ink-3)" }} onClick={() => onRemoveTraveler(p.id)} aria-label={t.travelers.remove} title={t.travelers.remove}>
                    ×
                  </button>
                ) : null}
              </div>
            );
          })
        )}
        <p className="text-xs text-ink-3">{t.travelers.filterHint}</p>
      </section>

      <section className="flex flex-col gap-2">
        <span className="lbl">{t.booking.title}</span>
        {reservations.length === 0 ? (
          <p className="text-xs text-ink-3">{t.booking.empty}</p>
        ) : (
          reservations.map((a) => {
            const d = fromYMD(a.date);
            return (
              <button key={a.id} className="rowbtn items-start bg-surface-2" onClick={() => onOpenActivity(a)}>
                <span className="w-2 h-2 rounded-full mt-2 shrink-0"
                  style={{ background: a.booking === "confirmed" ? "var(--c-home)" : "var(--citrus)" }} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{a.title}</span>
                  <span className="block text-xs text-ink-3">
                    {weekdayShort(d)} {d.getDate()} · {formatTime(a.start_min)} ·{" "}
                    {a.booking === "confirmed" ? t.booking.confirmedShort : t.booking.pendingShort}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-2">
        <span className="lbl">{t.members.title}</span>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2 px-2 py-1">
            {m.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <Avatar short={initials(m.full_name ?? m.email)} color="var(--ink-3)" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold truncate">{m.full_name ?? m.email}</span>
              <span className="block text-xs text-ink-3">{t.trips.role[m.role]}</span>
            </span>
            {isOwner && m.role !== "owner" ? (
              <button className="btn sm ghost" style={{ color: "var(--hibiscus)" }} onClick={() => onRemoveMember(m.user_id)} aria-label={t.travelers.remove}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        {isOwner ? (
          <form
            className="flex flex-col gap-2 mt-1"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              setInviting(true);
              const err = await onInvite(inviteEmail.trim(), "editor");
              setInviting(false);
              setInviteError(err);
              if (!err) setInviteEmail("");
            }}
          >
            <div className="field">
              <label htmlFor={`invite-${tripId}`}>{t.members.invite}</label>
              <input id={`invite-${tripId}`} type="email" value={inviteEmail} placeholder={t.members.emailPlaceholder}
                onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <button className="btn sm primary self-start" disabled={inviting}>{t.members.add}</button>
            <p className="text-xs" style={{ color: inviteError ? "var(--hibiscus)" : "var(--ink-3)" }}>
              {inviteError ?? t.members.hint}
            </p>
          </form>
        ) : null}
      </section>

      {addOpen ? (
        <AddTravelerSheet
          onClose={() => setAddOpen(false)}
          onAdd={(name, color) => {
            onAddTraveler({
              id: crypto.randomUUID(),
              trip_id: tripId,
              name,
              short_name: initials(name),
              color,
              user_id: null,
              position: travelers.length,
              created_at: new Date().toISOString(),
            });
            setAddOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddTravelerSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, color: string) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TRAVELER_COLORS[0]);

  return (
    <Sheet title={t.travelers.addTitle} subtitle={t.travelers.addHint} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onAdd(name.trim(), color);
        }}
      >
        <div className="field">
          <label htmlFor="p-name">{t.travelers.name}</label>
          <input id="p-name" type="text" value={name} placeholder={t.travelers.namePlaceholder} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>{t.travelers.color}</label>
          <div className="chips">
            {TRAVELER_COLORS.map((c) => (
              <button type="button" key={c} className={`chip${c === color ? " on" : ""}`} style={{ padding: "0 8px" }} onClick={() => setColor(c)} aria-label={c}>
                <span className="av" style={{ background: c }}>{name ? initials(name) : " "}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>{t.activity.cancel}</button>
          <button type="submit" className="btn primary">{t.travelers.add}</button>
        </div>
      </form>
    </Sheet>
  );
}
