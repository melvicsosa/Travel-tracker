"use client";

import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { toYMD, weekdayShort } from "@/lib/time";

export function DayStrip({
  days,
  selected,
  counts,
  onSelect,
}: {
  days: Date[];
  selected: number;
  counts: Record<string, number>;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Keep the selected day in view on phones.
  useEffect(() => {
    const el = ref.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  return (
    <div className="daystrip" ref={ref} role="tablist">
      {days.map((d, i) => {
        const n = counts[toYMD(d)] ?? 0;
        return (
          <button
            key={toYMD(d)}
            className={`daypill${i === selected ? " on" : ""}`}
            role="tab"
            aria-selected={i === selected}
            onClick={() => onSelect(i)}
          >
            <span className="dw">{weekdayShort(d)}</span>
            <span className="dn">{d.getDate()}</span>
            <span className="dc">{n ? t.calendar.activitiesShort(n) : t.calendar.free}</span>
          </button>
        );
      })}
    </div>
  );
}
