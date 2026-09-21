"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activity, Traveler } from "@/lib/database.types";
import { SNAP, clamp, formatDuration, formatHour, formatTime, fromYMD, nowInZone, snap, toYMD, weekdayShort } from "@/lib/time";
import { t } from "@/lib/i18n";
import { layoutColumns, sortByStart } from "@/lib/trip/layout";
import { ActivityBlock, type DragStart } from "./ActivityBlock";

type Drag = {
  activity: Activity;
  el: HTMLDivElement;
  mode: "move" | "resize";
  x0: number;
  y0: number;
  colWidth: number;
  startIdx: number;
  dMin: number;
  dCol: number;
  moved: boolean;
  pointerId: number;
  /** Removed on release; blocks native touch scrolling while a touch/pen drag is armed. */
  touchBlock?: (e: TouchEvent) => void;
};

/** A touch/pen press waiting to become a drag once it has been held long enough. */
type PendingPress = {
  el: HTMLDivElement;
  pointerId: number;
  timer?: ReturnType<typeof setTimeout>;
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
  onCancel: (e: PointerEvent) => void;
};

/** How long a touch/pen press must be held before it arms into a drag. */
const LONG_PRESS_MS = 400;
/** Movement past this many px before arming cancels the long-press and lets the page scroll. */
const LONG_PRESS_TOLERANCE_PX = 8;

/**
 * The time grid. One column per day. `hourPx` sets the vertical scale:
 * 60 for the single-day view, ~42 for the whole period. Drag to move, drag the
 * bottom edge to resize, tap to open. Works with mouse, touch and pen through
 * Pointer Events; keyboard arrows move the focused block.
 */
export function CalendarGrid({
  days,
  hourPx,
  dayStart,
  dayEnd,
  timeZone,
  activities,
  travelers,
  canEdit,
  onMove,
  onOpen,
  onCreateAt,
}: {
  days: Date[];
  hourPx: number;
  /** Visible window, minutes from midnight (e.g. 360–1440). */
  dayStart: number;
  dayEnd: number;
  /** IANA zone used for the "now" line and the initial scroll. */
  timeZone: string;
  activities: Activity[];
  travelers: Traveler[];
  canEdit: boolean;
  onMove: (a: Activity, date: string, startMin: number, durationMin: number) => void;
  onOpen: (a: Activity) => void;
  onCreateAt: (date: string, startMin: number) => void;
}) {
  const pxPerMin = hourPx / 60;
  const height = (dayEnd - dayStart) * pxPerMin;
  const multi = days.length > 1;
  const headH = multi ? 34 : 0;
  const PAD = 16;
  const PAD_BOTTOM = 40;
  const [now, setNow] = useState(() => nowInZone(timeZone));
  const today = now.ymd;

  // Tick the "now" line every minute (the first value comes from useState).
  useEffect(() => {
    const id = setInterval(() => setNow(nowInZone(timeZone)), 60_000);
    return () => clearInterval(id);
  }, [timeZone]);

  const colsRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pendingRef = useRef<PendingPress | null>(null);
  const [badge, setBadge] = useState<{ x: number; y: number; text: string } | null>(null);

  const byDay = useMemo(() => {
    const map: Record<string, { list: Activity[]; placement: ReturnType<typeof layoutColumns> }> = {};
    for (const d of days) {
      const key = toYMD(d);
      const list = sortByStart(activities.filter((a) => a.date === key));
      map[key] = { list, placement: layoutColumns(list) };
    }
    return map;
  }, [days, activities]);

  const dayKeys = useMemo(() => days.map(toYMD), [days]);

  // Initial scroll: to "now" when today is on screen, otherwise to the first
  // activity of the first visible day (or the top of the window).
  const scrollKey = dayKeys.join(",");
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Always land on the current time of day (the trip's zone) when it is
    // inside the visible window; otherwise on the first activity.
    let target = dayStart;
    if (now.minutes >= dayStart && now.minutes <= dayEnd) {
      target = now.minutes - 60;
    } else {
      const first = dayKeys.map((k) => byDay[k]?.list[0]).find(Boolean);
      if (first) target = first.start_min - 30;
    }
    el.scrollTop = Math.max(0, (target - dayStart) * pxPerMin);
    // Only on mount / day change; not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, dayStart, dayEnd, pxPerMin]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      if (!d.moved) return;
      const a = d.activity;

      if (d.mode === "move") {
        const ns = clamp(a.start_min + snap(dy / pxPerMin), dayStart, dayEnd - a.duration_min);
        d.dMin = ns - a.start_min;
        let dCol = 0;
        if (multi && d.colWidth > 0) {
          dCol = clamp(Math.round(dx / d.colWidth), -d.startIdx, dayKeys.length - 1 - d.startIdx);
        }
        d.dCol = dCol;
        d.el.style.transform = `translate(${dCol * d.colWidth}px, ${d.dMin * pxPerMin}px)`;
        const targetDay = fromYMD(dayKeys[d.startIdx + dCol]);
        setBadge({
          x: e.clientX,
          y: e.clientY,
          text:
            `${formatTime(a.start_min + d.dMin)} – ${formatTime(a.start_min + d.dMin + a.duration_min)}` +
            (dCol ? ` · ${weekdayShort(targetDay)} ${targetDay.getDate()}` : ""),
        });
      } else {
        const nd = clamp(snap(a.duration_min + dy / pxPerMin), SNAP, dayEnd - a.start_min);
        d.dMin = nd - a.duration_min;
        d.el.style.height = `${Math.max(18, nd * pxPerMin - 2)}px`;
        setBadge({ x: e.clientX, y: e.clientY, text: `${formatDuration(nd)} · hasta ${formatTime(a.start_min + nd)}` });
      }
    },
    [pxPerMin, multi, dayKeys, dayStart, dayEnd],
  );

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    document.removeEventListener("pointermove", onPointerMove);
    d.el.classList.remove("dragging", "armed");
    if (d.touchBlock) d.el.removeEventListener("touchmove", d.touchBlock);
    d.el.style.transform = "";
    setBadge(null);

    const a = d.activity;
    if (!d.moved) {
      onOpen(a);
      return;
    }
    if (d.mode === "move") {
      const date = dayKeys[d.startIdx + d.dCol] ?? a.date;
      onMove(a, date, a.start_min + d.dMin, a.duration_min);
    } else {
      onMove(a, a.date, a.start_min, a.duration_min + d.dMin);
    }
  }, [dayKeys, onMove, onOpen, onPointerMove]);

  const clearPendingPress = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    if (p.timer) clearTimeout(p.timer);
    document.removeEventListener("pointermove", p.onMove);
    document.removeEventListener("pointerup", p.onUp);
    document.removeEventListener("pointercancel", p.onCancel);
    pendingRef.current = null;
  }, []);

  /** Starts the real drag/resize tracking. `armed` is true for a touch/pen press that survived the long-press wait. */
  const beginDrag = useCallback(
    (pointerId: number, x0: number, y0: number, activity: Activity, mode: "move" | "resize", el: HTMLDivElement, armed: boolean) => {
      const colEls = colsRef.current ? Array.from(colsRef.current.querySelectorAll<HTMLElement>(".col")) : [];
      const colWidth = colEls.length ? colEls[0].getBoundingClientRect().width : 0;
      let touchBlock: ((e: TouchEvent) => void) | undefined;
      if (armed) {
        el.classList.add("armed");
        navigator.vibrate?.(10);
        // touch-action can't change mid-gesture, so scrolling is blocked by hand from here on.
        touchBlock = (e) => e.preventDefault();
        el.addEventListener("touchmove", touchBlock, { passive: false });
      }
      dragRef.current = {
        activity, el, mode, x0, y0, colWidth,
        startIdx: dayKeys.indexOf(activity.date), dMin: 0, dCol: 0, moved: false, pointerId, touchBlock,
      };
      try {
        el.setPointerCapture(pointerId);
      } catch {
        // Best-effort: some browsers reject capture once a gesture already resolved.
      }
      el.classList.add("dragging");
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
      document.addEventListener("pointercancel", onPointerUp, { once: true });
    },
    [dayKeys, onPointerMove, onPointerUp],
  );

  /**
   * Touch/pen presses wait for a long-press before becoming a drag, so a plain
   * swipe over a card scrolls the grid instead. `canArm` is false for a
   * read-only viewer, where a hold never becomes a drag — only a plain tap opens.
   */
  const startPendingPress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, activity: Activity, mode: "move" | "resize", el: HTMLDivElement, canArm: boolean) => {
      clearPendingPress();
      const pointerId = e.pointerId;
      const x0 = e.clientX;
      const y0 = e.clientY;
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (Math.abs(ev.clientX - x0) > LONG_PRESS_TOLERANCE_PX || Math.abs(ev.clientY - y0) > LONG_PRESS_TOLERANCE_PX) {
          clearPendingPress();
        }
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || !pendingRef.current) return;
        clearPendingPress();
        onOpen(activity);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        clearPendingPress();
      };
      const timer = canArm
        ? setTimeout(() => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onCancel);
            pendingRef.current = null;
            beginDrag(pointerId, x0, y0, activity, mode, el, true);
          }, LONG_PRESS_MS)
        : undefined;
      pendingRef.current = { el, pointerId, timer, onMove, onUp, onCancel };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
    },
    [beginDrag, clearPendingPress, onOpen],
  );

  const onDragStart: DragStart = useCallback(
    (e, activity, mode, el) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const touchLike = e.pointerType === "touch" || e.pointerType === "pen";

      if (!canEdit) {
        // Read-only: a tap opens the activity; a touch/pen swipe must still scroll.
        if (touchLike) {
          startPendingPress(e, activity, "move", el, false);
          return;
        }
        dragRef.current = {
          activity, el, mode: "move", x0: e.clientX, y0: e.clientY, colWidth: 0,
          startIdx: 0, dMin: 0, dCol: 0, moved: false, pointerId: e.pointerId,
        };
        document.addEventListener("pointerup", onPointerUp, { once: true });
        return;
      }

      if (touchLike) {
        // Wait for a long-press before arming the drag; a plain swipe scrolls instead.
        startPendingPress(e, activity, mode, el, true);
        return;
      }

      beginDrag(e.pointerId, e.clientX, e.clientY, activity, mode, el, false);
      e.preventDefault();
    },
    [beginDrag, canEdit, onPointerUp, startPendingPress],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      clearPendingPress();
    };
  }, [onPointerMove, clearPendingPress]);

  const onKeyMove = useCallback(
    (a: Activity, dMin: number, dDay: number) => {
      const idx = dayKeys.indexOf(a.date);
      const nextIdx = clamp(idx + dDay, 0, dayKeys.length - 1);
      onMove(a, dayKeys[nextIdx], a.start_min + dMin, a.duration_min);
    },
    [dayKeys, onMove],
  );

  const hourMarks: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += 60) hourMarks.push(m);
  const halfMarks: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += 30) halfMarks.push(m);

  // The red line is solid on today's column and a faint dashed reference on
  // every other day, so the current time is always readable.
  const showNow = now.minutes >= dayStart && now.minutes <= dayEnd;
  const nowTop = (now.minutes - dayStart) * pxPerMin;

  return (
    <div className="scroller" ref={scrollerRef}>
      <div className="timegrid">
        <div className="gutter" style={{ height: height + headH + PAD + PAD_BOTTOM }}>
          {headH ? <div className="ghead" style={{ height: headH }} /> : null}
          <div style={{ height: PAD }} />
          <div style={{ position: "relative", height }}>
            {hourMarks.map((m) => (
              <div key={m} className="hr mono" style={{ top: (m - dayStart) * pxPerMin }}>
                {formatHour(m)}
              </div>
            ))}
            {showNow ? (
              <div className="nowlabel mono" style={{ top: nowTop }} aria-label={t.hours.now}>
                {formatTime(now.minutes).replace(/ (a|p)\.m\./, "")}
              </div>
            ) : null}
          </div>
        </div>
        <div className={`cols${multi ? " multi" : ""}`} ref={colsRef}>
          {days.map((d) => {
            const key = toYMD(d);
            const { list, placement } = byDay[key];
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={key} className={`col${weekend ? " weekend" : ""}${key === today ? " today" : ""}`} data-date={key}>
                {multi ? (
                  <div className="colhead">
                    <span className="dw">{weekdayShort(d)}</span> <span className="dn">{d.getDate()}</span>
                  </div>
                ) : null}
                <div style={{ height: PAD }} />
                <div
                  className="colbody"
                  style={{ height }}
                  onDoubleClick={(e) => {
                    if (!canEdit || e.target !== e.currentTarget) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    onCreateAt(key, snap(dayStart + (e.clientY - r.top) / pxPerMin));
                  }}
                >
                  {halfMarks.map((m) => (
                    <div key={m} className={`hline${m % 60 ? " half" : ""}`} style={{ top: (m - dayStart) * pxPerMin }} />
                  ))}
                  {showNow ? <div className={`nowline${key === today ? "" : " ref"}`} style={{ top: nowTop }} aria-hidden="true" /> : null}
                  {list.map((a) => (
                    <ActivityBlock
                      key={a.id}
                      activity={a}
                      pxPerMin={pxPerMin}
                      dayStart={dayStart}
                      placement={placement[a.id]}
                      travelers={travelers}
                      canEdit={canEdit}
                      onDragStart={onDragStart}
                      onOpen={onOpen}
                      onKeyMove={onKeyMove}
                    />
                  ))}
                </div>
                <div style={{ height: PAD_BOTTOM }} />
              </div>
            );
          })}
        </div>
      </div>
      {badge ? (
        <div
          className="badge mono"
          style={{ left: Math.min(window.innerWidth - 200, badge.x + 14), top: badge.y - 40 }}
        >
          {badge.text}
        </div>
      ) : null}
    </div>
  );
}
