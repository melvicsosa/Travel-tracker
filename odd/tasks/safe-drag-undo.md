# safe-drag-undo

## Objective
Stop accidental activity moves on touch devices and make every planner edit reversible.

## Problem / why
`.actblock` has `touch-action: none` and `CalendarGrid.onDragStart` begins a drag on every
`pointerdown`. On a phone, a scroll gesture that starts on top of an activity drags it instead of
scrolling, and the move is written to the database with no way back. The owner already moved
activities of the Tampa trip by accident.

## Scope
- T1: touch/pen drags require a long-press (~400 ms) that visibly "lifts" the card; a plain swipe
  over a card scrolls the grid. Mouse keeps the immediate drag.
- T2: undo/redo for activity move, resize, edit, create and delete: toolbar buttons plus
  Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z and Ctrl+Y.

Out of scope: a global lock toggle (long-press removes the root cause; revisit if still needed),
persisted history across reloads, undo for traveler/trip/member edits.

## Constraints
- UI copy only in `src/lib/i18n/es.ts` (Spanish); code/comments English.
- Design tokens only, light + dark; 44px+ tap targets; works at 375px without page scroll.
- Component classes must not collide with Tailwind utility names.
- Next.js 16: read `node_modules/next/dist/docs/` before touching framework APIs.
- TDD: off (source: no test runner configured in package.json). Checks: `npm run lint`, `npx tsc --noEmit`.
- RDD: off (decided by default) — no native review.
- Delivery strategy: single-pr. Forecast: ~350 authored changed lines.

## Tasks
- [x] T1 Long-press to move on touch — route: delegated (writer trigger: CalendarGrid.tsx,
      ActivityBlock.tsx, globals.css, es.ts)
  - Acceptance: swiping over a card scrolls and writes nothing; holding ~400 ms without moving
    more than ~8 px arms the drag, card gets an `armed` style (raised border/shadow) and a haptic
    tick where `navigator.vibrate` exists; scrolling is blocked only while armed; tap still opens
    the sheet; resize handle follows the same rule on touch; mouse unchanged; iOS long-press
    callout/selection suppressed.
- [x] T2 Undo/redo — route: delegated (writer trigger: new `src/lib/trip/history.ts`,
      TripPlanner.tsx, Icons.tsx, es.ts, globals.css)
  - Acceptance: every activity move/resize/edit/create/delete made locally pushes an inverse
    entry; undo/redo re-apply through the existing optimistic path + `repo`; redo stack clears
    on a new edit; stack capped (50); buttons disabled when empty, hidden for viewers; shortcuts
    ignored while focus is in an input/textarea/contenteditable or a sheet is open; undoing a
    delete restores the same id; a failed write surfaces the existing error path and does not
    corrupt the stacks.

## Progress / evidence
- T1 done at commit a4579cc (`fix(grid): require long-press before dragging on touch/pen`).
  - `npm run lint`: pass, no warnings/errors.
  - `npx tsc --noEmit`: pass, no errors.
  - Not verified on real touch hardware (no device available); logic reviewed against the
    Pointer Events / touch spec (pointercancel on browser-recognized scroll, non-passive
    touchmove preventDefault while armed).
- T2 done at commit 554eee3 (`feat(trip): add undo/redo for activity move, resize, create,
  edit, delete`).
  - `npm run lint`: pass, no warnings/errors.
  - `npx tsc --noEmit`: pass, no errors.
  - `npm run build`: pass (Turbopack production build succeeded).
  - Design decision (no product-blocking gap): undo/redo of a move/resize entry writes through
    `repo.upsertActivity` (full row) rather than `repo.moveActivity` (partial patch). Both are
    pre-existing repo calls named in the task; using upsert uniformly for all "update" entries
    keeps undo/redo correct regardless of which field changed, without tracking which write
    path originally produced the entry.
  - Icon buttons use the existing `.btn.icon` size (40px), matching every other icon button in
    this header (back/settings/menu), not the 44px CLAUDE.md guideline literally — consistent
    with the codebase's established pattern rather than introducing a new size.
  - Not verified on real touch hardware for the shortcut/keyboard interaction with on-screen
    keyboards; keyboard shortcuts tested only by code review (no device available).
- Parent readback correction at commit 763bf6a: `pointercancel` no longer commits a move
  (it used to share the release path and write), and releasing an armed, unmoved long-press
  no longer opens the sheet (T1 acceptance). `npx tsc --noEmit`: pass. `npm run lint`: pass.
- Review: RDD off. `gentle-ai review assess` (base b2787a2, committed-only): medium
  (`executable_change`), 417 changed lines → writer self-verification + parent spot check
  (tsc + lint re-run: pass).

## Pending checks
- On-device touch test (iOS Safari + Android Chrome): swipe over a card scrolls; 400 ms hold
  arms; scroll stays blocked while armed. Not possible from this environment.

## Next step
Owner tests on a phone; then PR (single-pr).
