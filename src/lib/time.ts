import { t } from "@/lib/i18n";

/** Calendar bounds and snapping, in minutes from midnight. */
export const DAY_START = 6 * 60;
export const DAY_END = 24 * 60;
export const SNAP = 15;

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "YYYY-MM-DD" for a local Date. */
export function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse "YYYY-MM-DD" as a local Date (no timezone shift). */
export function fromYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Every day between two YMD strings, inclusive. */
export function daysBetween(start: string, end: string) {
  const out: Date[] = [];
  const cur = fromYMD(start);
  const last = fromYMD(end);
  let guard = 0;
  while (cur <= last && guard++ < 400) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function snap(min: number) {
  return Math.round(min / SNAP) * SNAP;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** 540 → "9:00 a.m." */
export function formatTime(min: number) {
  const m = clamp(Math.round(min), 0, 1439);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 ? t.dates.pm : t.dates.am;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(mm)} ${suffix}`;
}

/** 540 → "9 a.m." (hour labels on the grid). */
export function formatHour(min: number) {
  if (min === 1440) return `12 ${t.dates.am}`;
  return formatTime(min).replace(":00", "");
}

/** 90 → "1 h 30 min" */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  if (h && mm) return `${h} h ${mm} min`;
  if (h) return h === 1 ? "1 hora" : `${h} horas`;
  return `${mm} min`;
}

/** "09:30" (input[type=time]) → 570 */
export function timeInputToMinutes(v: string) {
  const [h, m] = (v || "0:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 570 → "09:30" */
export function minutesToTimeInput(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function weekdayShort(d: Date) {
  return t.dates.weekdaysShort[d.getDay()];
}

export function monthShort(d: Date) {
  return t.dates.monthsShort[d.getMonth()];
}

/** "2 oct – 12 oct 2026" */
export function formatRange(start: string, end: string) {
  const a = fromYMD(start);
  const b = fromYMD(end);
  return `${a.getDate()} ${monthShort(a)} – ${b.getDate()} ${monthShort(b)} ${b.getFullYear()}`;
}
