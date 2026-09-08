import type { Activity } from "@/lib/database.types";

export type Placement = { col: number; cols: number };

/**
 * Assigns side-by-side columns to activities that overlap in time, so two
 * things at 10:00 render next to each other instead of on top of each other.
 * Input must be sorted by start_min.
 */
export function layoutColumns(list: Activity[]): Record<string, Placement> {
  const result: Record<string, Placement> = {};
  let cluster: Activity[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    for (const a of cluster) {
      let placed = false;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= a.start_min) {
          colEnds[i] = a.start_min + a.duration_min;
          result[a.id] = { col: i, cols: 0 };
          placed = true;
          break;
        }
      }
      if (!placed) {
        result[a.id] = { col: colEnds.length, cols: 0 };
        colEnds.push(a.start_min + a.duration_min);
      }
    }
    for (const a of cluster) result[a.id].cols = colEnds.length;
    cluster = [];
  };

  for (const a of list) {
    if (cluster.length && a.start_min >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(a);
    clusterEnd = Math.max(clusterEnd, a.start_min + a.duration_min);
  }
  flush();
  return result;
}

export function sortByStart(list: Activity[]) {
  return [...list].sort((x, y) => x.start_min - y.start_min || y.duration_min - x.duration_min);
}
