"use client";

import { formatHour } from "@/lib/time";
import { t } from "@/lib/i18n";

/**
 * Two-thumb slider that picks the hour window the grid shows.
 * Values are minutes from midnight in whole hours; end can be 24:00 (1440).
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
  const min = 0;
  const max = 1440;
  const step = 60;
  const lo = (start / max) * 100;
  const hi = (end / max) * 100;

  return (
    <div className="hourrange" role="group" aria-label={t.calendar.hoursShown}>
      <span className="hr-label mono">
        {formatHour(start)} – {formatHour(end)}
      </span>
      <div className="hr-track" style={{ ["--lo" as string]: `${lo}%`, ["--hi" as string]: `${hi}%` }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={start}
          aria-label={t.calendar.from}
          onChange={(e) => onChange(Math.min(Number(e.target.value), end - step), end)}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={end}
          aria-label={t.calendar.to}
          onChange={(e) => onChange(start, Math.max(Number(e.target.value), start + step))}
        />
      </div>
    </div>
  );
}
