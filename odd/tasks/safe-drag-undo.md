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
- [ ] T1 Long-press to move on touch — route: delegated (writer trigger: CalendarGrid.tsx,
      ActivityBlock.tsx, globals.css, es.ts)
  - Acceptance: swiping over a card scrolls and writes nothing; holding ~400 ms without moving
    more than ~8 px arms the drag, card gets an `armed` style (raised border/shadow) and a haptic
    tick where `navigator.vibrate` exists; scrolling is blocked only while armed; tap still opens
    the sheet; resize handle follows the same rule on touch; mouse unchanged; iOS long-press
    callout/selection suppressed.
- [ ] T2 Undo/redo — route: delegated (writer trigger: new `src/lib/trip/history.ts`,
      TripPlanner.tsx, Icons.tsx, es.ts, globals.css)
  - Acceptance: every activity move/resize/edit/create/delete made locally pushes an inverse
    entry; undo/redo re-apply through the existing optimistic path + `repo`; redo stack clears
    on a new edit; stack capped (50); buttons disabled when empty, hidden for viewers; shortcuts
    ignored while focus is in an input/textarea/contenteditable or a sheet is open; undoing a
    delete restores the same id; a failed write surfaces the existing error path and does not
    corrupt the stacks.

## Progress / evidence
- (pending)

## Next step
T1.
