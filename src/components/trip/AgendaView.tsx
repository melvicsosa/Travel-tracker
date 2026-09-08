"use client";

import type { Activity, Traveler } from "@/lib/database.types";
import { t } from "@/lib/i18n";
import { formatTime, toYMD, weekdayShort } from "@/lib/time";
import { sortByStart } from "@/lib/trip/layout";
import { Avatar } from "@/components/ui/Avatar";

export function AgendaView({
  days,
  activities,
  travelers,
  onOpen,
}: {
  days: Date[];
  activities: Activity[];
  travelers: Traveler[];
  onOpen: (a: Activity) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
      {days.map((d) => {
        const key = toYMD(d);
        const list = sortByStart(activities.filter((a) => a.date === key));
        return (
          <section key={key} className="max-w-3xl mx-auto mb-7 flex flex-col gap-2">
            <h2 className="text-lg flex items-baseline gap-2">
              <span>
                {weekdayShort(d).toUpperCase()} {d.getDate()} de {t.dates.months[d.getMonth()]}
              </span>
              <span className="text-xs font-sans font-semibold text-ink-3 tracking-wide">
                {list.length ? t.calendar.activities(list.length) : t.calendar.freeDay}
              </span>
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-ink-3">{t.calendar.noActivities}</p>
            ) : (
              list.map((a) => (
                <button
                  key={a.id}
                  className="arow"
                  style={{ ["--ac" as string]: `var(--c-${a.category})` }}
                  onClick={() => onOpen(a)}
                >
                  <span className="tm mono">
                    {formatTime(a.start_min)} – {formatTime(a.start_min + a.duration_min)}
                  </span>
                  <span className="min-w-0">
                    <span className="tt block truncate">
                      {a.title}
                      {a.booking === "pending" ? (
                        <span className="text-citrus text-[11px] font-extrabold ml-2">· {t.booking.flag}</span>
                      ) : null}
                    </span>
                    {a.place ? <span className="pp block truncate">{a.place}</span> : null}
                  </span>
                  <span className="who">
                    {a.traveler_ids.map((id) => {
                      const p = travelers.find((x) => x.id === id);
                      return p ? <Avatar key={id} short={p.short_name} color={p.color} name={p.name} /> : null;
                    })}
                  </span>
                </button>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
