"use client";

import { useEffect, useRef, useState } from "react";
import { formatHour } from "@/lib/time";
import { t } from "@/lib/i18n";

const HOURS = Array.from({ length: 25 }, (_, i) => i * 60); // 0:00 … 24:00

const PRESETS: { key: keyof typeof t.hours.presets; start: number; end: number }[] = [
  { key: "waking", start: 360, end: 1440 },
  { key: "morning", start: 360, end: 840 },
  { key: "afternoon", start: 720, end: 1440 },
  { key: "all", start: 0, end: 1440 },
];

/**
 * Picks the hour window the grid shows. A pill shows the current window;
 * clicking it opens a small popover with From/To selects and presets.
 */
export function HourRange({
  start,
  end,
  onChange,
}: {
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="hourwin" ref={ref}>
      <button
        type="button"
        className="pill"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t.hours.label}: ${formatHour(start)} – ${formatHour(end)}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 5.5V10l3 2" />
        </svg>
        <span className="mono">
          {formatHour(start)} – {formatHour(end)}
        </span>
      </button>

      {open ? (
        <div className="pop" role="dialog" aria-label={t.hours.label}>
          <div className="row">
            <div className="field">
              <label htmlFor="hw-from">{t.hours.from}</label>
              <select id="hw-from" value={start} onChange={(e) => onChange(Number(e.target.value), Math.max(end, Number(e.target.value) + 60))}>
                {HOURS.filter((h) => h < 1440).map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hw-to">{t.hours.to}</label>
              <select id="hw-to" value={end} onChange={(e) => onChange(Math.min(start, Number(e.target.value) - 60), Number(e.target.value))}>
                {HOURS.filter((h) => h > 0).map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="presets">
            {PRESETS.map((p) => {
              const on = p.start === start && p.end === end;
              return (
                <button type="button" key={p.key} className={`chip${on ? " on" : ""}`} onClick={() => onChange(p.start, p.end)}>
                  {t.hours.presets[p.key]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
