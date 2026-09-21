import type { Activity } from "@/lib/database.types";

/**
 * Local undo/redo history for activity edits made by this user in the trip
 * planner. Framework-free: plain immutable state plus pure functions: the
 * caller (TripPlanner) wires this into React with a ref for the current
 * state and a small bit of state for the `canUndo`/`canRedo` flags used to
 * disable the toolbar buttons.
 *
 * Entries are self-contained inverse-able operations, so applying one needs
 * nothing beyond the entry itself:
 * - `update`: an activity changed (move, resize, or a sheet edit). Holds the
 *   full activity before and after.
 * - `create`: a new activity was added.
 * - `delete`: an activity was removed.
 */
export type ActivityHistoryEntry =
  | { kind: "update"; id: string; before: Activity; after: Activity }
  | { kind: "create"; activity: Activity }
  | { kind: "delete"; activity: Activity };

export type ActivityHistoryState = {
  undo: ActivityHistoryEntry[];
  redo: ActivityHistoryEntry[];
};

/** Maximum entries kept per stack; the oldest entry drops first past this. */
export const HISTORY_CAP = 50;

export function createHistory(): ActivityHistoryState {
  return { undo: [], redo: [] };
}

/** Records a new local edit. Clears the redo stack, since it would now be stale. */
export function pushHistory(state: ActivityHistoryState, entry: ActivityHistoryEntry): ActivityHistoryState {
  return { undo: [...state.undo, entry].slice(-HISTORY_CAP), redo: [] };
}

export type PoppedHistory = { entry: ActivityHistoryEntry; next: ActivityHistoryState };

/** Moves the most recent undo entry onto the redo stack and returns it, or null when there is nothing to undo. */
export function popUndo(state: ActivityHistoryState): PoppedHistory | null {
  if (state.undo.length === 0) return null;
  const entry = state.undo[state.undo.length - 1];
  return {
    entry,
    next: { undo: state.undo.slice(0, -1), redo: [...state.redo, entry].slice(-HISTORY_CAP) },
  };
}

/** Moves the most recent redo entry back onto the undo stack and returns it, or null when there is nothing to redo. */
export function popRedo(state: ActivityHistoryState): PoppedHistory | null {
  if (state.redo.length === 0) return null;
  const entry = state.redo[state.redo.length - 1];
  return {
    entry,
    next: { undo: [...state.undo, entry].slice(-HISTORY_CAP), redo: state.redo.slice(0, -1) },
  };
}

/** The operation that reverses an entry's effect — what an undo actually applies. */
export function inverseEntry(entry: ActivityHistoryEntry): ActivityHistoryEntry {
  switch (entry.kind) {
    case "update":
      return { kind: "update", id: entry.id, before: entry.after, after: entry.before };
    case "create":
      return { kind: "delete", activity: entry.activity };
    case "delete":
      return { kind: "create", activity: entry.activity };
  }
}

/** True when two activities are equivalent for history purposes (ignores created_at/updated_at). */
export function activitiesEqual(a: Activity, b: Activity): boolean {
  return (
    a.title === b.title &&
    a.place === b.place &&
    a.notes === b.notes &&
    a.date === b.date &&
    a.start_min === b.start_min &&
    a.duration_min === b.duration_min &&
    a.category === b.category &&
    a.booking === b.booking &&
    a.traveler_ids.length === b.traveler_ids.length &&
    a.traveler_ids.every((id, i) => id === b.traveler_ids[i])
  );
}
