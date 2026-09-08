import type { ActivityCategory } from "@/lib/database.types";

/** Order used in selects and chips. Colors come from CSS tokens (--c-<id>). */
export const CATEGORIES: ActivityCategory[] = [
  "transfer",
  "food",
  "outdoors",
  "attraction",
  "shopping",
  "home",
  "event",
];

/** Palette for traveler avatars. */
export const TRAVELER_COLORS = [
  "#0E7C86",
  "#C2610F",
  "#6B4CA8",
  "#B33F72",
  "#3E7A52",
  "#9A3A8C",
  "#2F6BA8",
];

/** "Sol de Luna" → "SL", "Johan" → "JO" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}
