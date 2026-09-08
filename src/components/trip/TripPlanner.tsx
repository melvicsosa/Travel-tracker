"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Activity, Traveler, Trip, TripInvite, TripMemberWithProfile, TripRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { repo } from "@/lib/trip/repo";
import { t } from "@/lib/i18n";
import { DAY_END, DAY_START, SNAP, clamp, daysBetween, formatRange, nowInZone, snap, toYMD } from "@/lib/time";
import { BackIcon, MenuIcon, PlusIcon } from "@/components/ui/Icons";
import { DayStrip } from "./DayStrip";
import { HourRange } from "./HourRange";
import { CalendarGrid } from "./CalendarGrid";
import { AgendaView } from "./AgendaView";
import { ActivitySheet } from "./ActivitySheet";
import { SidePanel } from "./SidePanel";
import { TripSettingsSheet } from "./TripSettingsSheet";
import { SettingsIcon } from "@/components/ui/Icons";

type View = "day" | "period" | "agenda";

/**
 * Client root of a trip. Holds the live copies of activities / travelers /
 * members, subscribes to realtime changes, and applies optimistic updates.
 */
export function TripPlanner({
  trip: initialTrip,
  initialTravelers,
  initialActivities,
  initialMembers,
  initialInvites = [],
  me,
}: {
  trip: Trip;
  initialTravelers: Traveler[];
  initialActivities: Activity[];
  initialMembers: TripMemberWithProfile[];
  initialInvites?: TripInvite[];
  me: { id: string; role: TripRole; isAdmin: boolean };
}) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activities, setActivities] = useState(initialActivities);
  const [travelers, setTravelers] = useState(initialTravelers);
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [view, setView] = useState<View>("day");
  // Start on today when the trip is in progress, otherwise on day one.
  const [dayIndex, setDayIndex] = useState(() => {
    const i = daysBetween(initialTrip.start_date, initialTrip.end_date)
      .map(toYMD)
      .indexOf(nowInZone(initialTrip.timezone || "America/New_York").ymd);
    return i >= 0 ? i : 0;
  });
  const [filterTraveler, setFilterTraveler] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ activity: Activity; isNew: boolean } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Visible hour window. Remembered per browser; defaults to 6 a.m.–midnight.
  const [hours, setHours] = useState<{ start: number; end: number }>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("tt:hours") : null;
      if (raw) {
        const v = JSON.parse(raw);
        if (Number.isFinite(v.start) && Number.isFinite(v.end) && v.end > v.start) return v;
      }
    } catch {}
    return { start: DAY_START, end: DAY_END };
  });
  const setHourWindow = useCallback((start: number, end: number) => {
    setHours({ start, end });
    try {
      window.localStorage.setItem("tt:hours", JSON.stringify({ start, end }));
    } catch {}
  }, []);

  const canEdit = me.isAdmin || me.role === "owner" || me.role === "editor";
  const isOwner = me.isAdmin || me.role === "owner";
  const timeZone = trip.timezone || "America/New_York";
  const days = useMemo(() => daysBetween(trip.start_date, trip.end_date), [trip.start_date, trip.end_date]);
  const dayKeys = useMemo(() => days.map(toYMD), [days]);

  // Realtime: keep local state in sync with other members' edits.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-${trip.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities", filter: `trip_id=eq.${trip.id}` }, (payload) => {
        setActivities((list) => applyChange(list, payload.eventType, payload.new as Activity, payload.old as Partial<Activity>));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "travelers", filter: `trip_id=eq.${trip.id}` }, (payload) => {
        setTravelers((list) =>
          applyChange(list, payload.eventType, payload.new as Traveler, payload.old as Partial<Traveler>).sort((a, b) => a.position - b.position),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${trip.id}` }, async () => {
        const { data } = await supabase.rpc("trip_members_with_profiles", { p_trip_id: trip.id });
        if (data) setMembers(data as TripMemberWithProfile[]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${trip.id}` }, (payload) => {
        setTrip((old) => ({ ...old, ...(payload.new as Partial<Trip>) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_invites", filter: `trip_id=eq.${trip.id}` }, async () => {
        const { data } = await supabase.from("trip_invites").select("*").eq("trip_id", trip.id).order("created_at");
        if (data) setInvites(data as TripInvite[]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id]);

  const fail = useCallback((e: unknown) => {
    console.error(e);
    setNotice(t.common.saveError);
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const visible = useMemo(
    () => (filterTraveler ? activities.filter((a) => a.traveler_ids.includes(filterTraveler)) : activities),
    [activities, filterTraveler],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of activities) c[a.date] = (c[a.date] ?? 0) + 1;
    return c;
  }, [activities]);

  const moveActivity = useCallback(
    (a: Activity, date: string, startMin: number, durationMin: number) => {
      const start = clamp(snap(startMin), 0, 1440 - SNAP);
      const duration = clamp(snap(durationMin), SNAP, 1440 - start);
      if (a.date === date && a.start_min === start && a.duration_min === duration) return;
      const patch = { date, start_min: start, duration_min: duration };
      setActivities((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
      repo.moveActivity(a.id, patch).catch(fail);
    },
    [fail],
  );

  const saveActivity = useCallback(
    (a: Activity) => {
      setActivities((list) => (list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]));
      setEditing(null);
      const i = dayKeys.indexOf(a.date);
      if (i >= 0) setDayIndex(i);
      repo.upsertActivity(a).catch(fail);
    },
    [dayKeys, fail],
  );

  const deleteActivity = useCallback(
    (id: string) => {
      setActivities((list) => list.filter((x) => x.id !== id));
      setEditing(null);
      repo.deleteActivity(id).catch(fail);
    },
    [fail],
  );

  const newActivity = useCallback(
    (date?: string, startMin?: number) => {
      const a: Activity = {
        id: crypto.randomUUID(),
        trip_id: trip.id,
        title: "",
        place: "",
        notes: "",
        date: date ?? dayKeys[Math.min(dayIndex, dayKeys.length - 1)],
        start_min: startMin ?? 540,
        duration_min: 60,
        category: "transfer",
        booking: "none",
        traveler_ids: travelers.map((p) => p.id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEditing({ activity: a, isNew: true });
    },
    [trip.id, dayKeys, dayIndex, travelers],
  );

  const openActivity = useCallback((a: Activity) => setEditing({ activity: a, isNew: false }), []);

  const addTraveler = useCallback(
    (p: Traveler) => {
      setTravelers((list) => [...list, p]);
      repo.upsertTraveler(p).catch(fail);
    },
    [fail],
  );
  const removeTraveler = useCallback(
    (id: string) => {
      setTravelers((list) => list.filter((p) => p.id !== id));
      repo.deleteTraveler(id).catch(fail);
    },
    [fail],
  );

  const invite = useCallback(
    async (email: string, role: TripRole): Promise<{ ok: boolean; message: string }> => {
      try {
        const result = await repo.addMemberByEmail(trip.id, email, role);
        if (result === "invited") {
          setInvites((list) =>
            list.some((i) => i.email === email.toLowerCase())
              ? list
              : [...list, { trip_id: trip.id, email: email.toLowerCase(), role, invited_by: me.id, created_at: new Date().toISOString() }],
          );
        }
        return { ok: true, message: result === "added" ? t.members.added : t.members.invited };
      } catch (e) {
        const code = (e as { code?: string }).code;
        return { ok: false, message: code === "22023" ? t.members.invalidEmail : t.common.saveError };
      }
    },
    [trip.id, me.id],
  );
  const removeInvite = useCallback(
    (email: string) => {
      setInvites((list) => list.filter((i) => i.email !== email));
      repo.removeInvite(trip.id, email).catch(fail);
    },
    [trip.id, fail],
  );
  const removeMember = useCallback(
    (userId: string) => {
      setMembers((list) => list.filter((m) => m.user_id !== userId));
      repo.removeMember(trip.id, userId).catch(fail);
    },
    [trip.id, fail],
  );

  const saveSettings = useCallback(
    (patch: Pick<Trip, "name" | "place" | "start_date" | "end_date" | "timezone">) => {
      setTrip((old) => ({ ...old, ...patch }));
      setSettingsOpen(false);
      repo.updateTrip(trip.id, patch).catch(fail);
    },
    [trip.id, fail],
  );
  const deleteTrip = useCallback(() => {
    repo
      .deleteTrip(trip.id)
      .then(() => router.push("/trips"))
      .catch(fail);
  }, [trip.id, router, fail]);

  const panel = (
    <SidePanel
      tripId={trip.id}
      travelers={travelers}
      activities={activities}
      members={members}
      invites={invites}
      filterTraveler={filterTraveler}
      canEdit={canEdit}
      isOwner={isOwner}
      onFilter={(id) => {
        setFilterTraveler(id);
        setPanelOpen(false);
      }}
      onAddTraveler={addTraveler}
      onRemoveTraveler={removeTraveler}
      onOpenActivity={(a) => {
        setPanelOpen(false);
        openActivity(a);
      }}
      onInvite={invite}
      onRemoveMember={removeMember}
      onRemoveInvite={removeInvite}
    />
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b border-line bg-surface flex-wrap">
        <Link href="/trips" className="btn icon ghost" aria-label={t.common.back}>
          <BackIcon />
        </Link>
        <div className="min-w-0 flex-1 sm:flex-none">
          <h1 className="text-lg sm:text-xl leading-tight truncate">{trip.name}</h1>
          <div className="text-xs text-ink-3 truncate">
            {trip.place ? `${trip.place} · ` : ""}
            {formatRange(trip.start_date, trip.end_date)} · {t.trips.days(days.length)}
          </div>
        </div>
        <div className="hidden sm:block flex-1" />
        <div className="segmented order-last w-full sm:order-none sm:w-auto" role="group" aria-label="Vista">
          {(["day", "period", "agenda"] as View[]).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
              {t.views[v]}
            </button>
          ))}
        </div>
        {isOwner ? (
          <button className="btn icon ghost" onClick={() => setSettingsOpen(true)} aria-label={t.settings.open} title={t.settings.open}>
            <SettingsIcon />
          </button>
        ) : null}
        {canEdit ? (
          <button className="btn primary hidden sm:inline-flex" onClick={() => newActivity()}>
            <PlusIcon />
            {t.activity.new}
          </button>
        ) : null}
        <button className="btn icon ghost lg:hidden" onClick={() => setPanelOpen(true)} aria-label={t.common.menu}>
          <MenuIcon />
        </button>
      </header>

      {notice ? <div className="notice">{notice}</div> : null}

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {view === "day" ? (
            <>
              <div className="flex items-center border-b border-line bg-surface">
                <div className="min-w-0 flex-1">
                  <DayStrip days={days} selected={dayIndex} counts={counts} onSelect={setDayIndex} />
                </div>
                <div className="hidden md:flex items-center px-4 shrink-0">
                  <HourRange start={hours.start} end={hours.end} onChange={setHourWindow} />
                </div>
              </div>
              <div className="md:hidden flex justify-end px-4 py-2 border-b border-line bg-surface">
                <HourRange start={hours.start} end={hours.end} onChange={setHourWindow} />
              </div>
              <CalendarGrid
                days={[days[Math.min(dayIndex, days.length - 1)]]}
                hourPx={60}
                dayStart={hours.start}
                dayEnd={hours.end}
                timeZone={timeZone}
                activities={visible}
                travelers={travelers}
                canEdit={canEdit}
                onMove={moveActivity}
                onOpen={openActivity}
                onCreateAt={newActivity}
              />
            </>
          ) : view === "period" ? (
            <>
              <div className="flex items-center justify-end px-4 py-2 border-b border-line bg-surface">
                <HourRange start={hours.start} end={hours.end} onChange={setHourWindow} />
              </div>
              <CalendarGrid
              days={days}
              hourPx={42}
              dayStart={hours.start}
              dayEnd={hours.end}
              timeZone={timeZone}
              activities={visible}
              travelers={travelers}
              canEdit={canEdit}
              onMove={moveActivity}
              onOpen={openActivity}
              onCreateAt={newActivity}
            />
            </>
          ) : (
            <AgendaView days={days} activities={visible} travelers={travelers} onOpen={openActivity} />
          )}
        </div>

        <aside className="hidden lg:block w-72 shrink-0 border-l border-line bg-surface overflow-y-auto p-4">{panel}</aside>
      </div>

      {/* Mobile: floating add button and slide-in panel */}
      {canEdit ? (
        <button
          className="btn primary icon sm:hidden fixed right-4 z-30 rounded-full shadow-[var(--shadow-lift)]"
          style={{ bottom: "calc(16px + var(--safe-bottom))", width: 52, height: 52 }}
          onClick={() => newActivity()}
          aria-label={t.activity.new}
        >
          <PlusIcon className="!w-5 !h-5" />
        </button>
      ) : null}
      {panelOpen ? (
        <div className="scrim lg:hidden" style={{ placeItems: "stretch end" }} onMouseDown={(e) => e.target === e.currentTarget && setPanelOpen(false)}>
          <aside className="bg-surface w-[min(320px,86vw)] h-full overflow-y-auto p-4 shadow-[var(--shadow-lift)] ml-auto">
            <div className="flex justify-end mb-2">
              <button className="btn sm ghost" onClick={() => setPanelOpen(false)}>{t.common.close}</button>
            </div>
            {panel}
          </aside>
        </div>
      ) : null}

      {settingsOpen ? (
        <TripSettingsSheet trip={trip} onSave={saveSettings} onDelete={deleteTrip} onClose={() => setSettingsOpen(false)} />
      ) : null}

      {editing ? (
        <ActivitySheet
          activity={editing.activity}
          isNew={editing.isNew}
          days={days}
          travelers={travelers}
          canEdit={canEdit}
          onSave={saveActivity}
          onDelete={deleteActivity}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

/** Applies a realtime row change to a local list. */
function applyChange<T extends { id: string }>(list: T[], type: string, row: T, old: Partial<T>): T[] {
  if (type === "DELETE") return list.filter((x) => x.id !== old.id);
  if (type === "INSERT") return list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
  return list.map((x) => (x.id === row.id ? row : x));
}
