"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activity, Traveler } from "@/lib/database.types";
import { DAY_END, DAY_START, SNAP, clamp, formatDuration, formatHour, formatTime, fromYMD, snap, toYMD, weekdayShort } from "@/lib/time";
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
};

/**
 * The time grid. One column per day. `hourPx` sets the vertical scale:
 * 60 for the single-day view, ~42 for the whole period. Drag to move, drag the
 * bottom edge to resize, tap to open. Works with mouse, touch and pen through
 * Pointer Events; keyboard arrows move the focused block.
 */
export function CalendarGrid({
  days,
  hourPx,
  activities,
  travelers,
  canEdit,
  onMove,
  onOpen,
  onCreateAt,
}: {
  days: Date[];
  hourPx: number;
  activities: Activity[];
  travelers: Traveler[];
  canEdit: boolean;
  onMove: (a: Activity, date: string, startMin: number, durationMin: number) => void;
  onOpen: (a: Activity) => void;
  onCreateAt: (date: string, startMin: number) => void;
}) {
  const pxPerMin = hourPx / 60;
  const height = (DAY_END - DAY_START) * pxPerMin;
  const multi = days.length > 1;
  const headH = multi ? 34 : 0;
  const PAD = 10;
  const today = toYMD(new Date());

  const colsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
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
        const ns = clamp(a.start_min + snap(dy / pxPerMin), DAY_START, DAY_END - a.duration_min);
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
        const nd = clamp(snap(a.duration_min + dy / pxPerMin), SNAP, DAY_END - a.start_min);
        d.dMin = nd - a.duration_min;
        d.el.style.height = `${Math.max(18, nd * pxPerMin - 2)}px`;
        setBadge({ x: e.clientX, y: e.clientY, text: `${formatDuration(nd)} · hasta ${formatTime(a.start_min + nd)}` });
      }
    },
    [pxPerMin, multi, dayKeys],
  );

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    document.removeEventListener("pointermove", onPointerMove);
    d.el.classList.remove("dragging");
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

  const onDragStart: DragStart = useCallback(
    (e, activity, mode, el) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canEdit) {
        // Read-only: a tap just opens the activity.
        dragRef.current = {
          activity, el, mode: "move", x0: e.clientX, y0: e.clientY, colWidth: 0,
          startIdx: 0, dMin: 0, dCol: 0, moved: false, pointerId: e.pointerId,
        };
        document.addEventListener("pointerup", onPointerUp, { once: true });
        return;
      }
      const colEls = colsRef.current ? Array.from(colsRef.current.querySelectorAll<HTMLElement>(".col")) : [];
      const colWidth = colEls.length ? colEls[0].getBoundingClientRect().width : 0;
      dragRef.current = {
        activity, el, mode, x0: e.clientX, y0: e.clientY, colWidth,
        startIdx: dayKeys.indexOf(activity.date), dMin: 0, dCol: 0, moved: false, pointerId: e.pointerId,
      };
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
      document.addEventListener("pointercancel", onPointerUp, { once: true });
      e.preventDefault();
    },
    [canEdit, dayKeys, onPointerMove, onPointerUp],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, [onPointerMove]);

  const onKeyMove = useCallback(
    (a: Activity, dMin: number, dDay: number) => {
      const idx = dayKeys.indexOf(a.date);
      const nextIdx = clamp(idx + dDay, 0, dayKeys.length - 1);
      onMove(a, dayKeys[nextIdx], a.start_min + dMin, a.duration_min);
    },
    [dayKeys, onMove],
  );

  const hourMarks: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hourMarks.push(m);
  const halfMarks: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 30) halfMarks.push(m);

  return (
    <div className="scroller">
      <div className="timegrid">
        <div className="gutter" style={{ height: height + headH + PAD }}>
          {headH ? <div className="ghead" style={{ height: headH }} /> : null}
          <div style={{ height: PAD }} />
          <div style={{ position: "relative", height }}>
            {hourMarks.map((m) => (
              <div key={m} className="hr mono" style={{ top: (m - DAY_START) * pxPerMin }}>
                {formatHour(m)}
              </div>
            ))}
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
                    onCreateAt(key, snap(DAY_START + (e.clientY - r.top) / pxPerMin));
                  }}
                >
                  {halfMarks.map((m) => (
                    <div key={m} className={`hline${m % 60 ? " half" : ""}`} style={{ top: (m - DAY_START) * pxPerMin }} />
                  ))}
                  {list.map((a) => (
                    <ActivityBlock
                      key={a.id}
                      activity={a}
                      pxPerMin={pxPerMin}
                      placement={placement[a.id]}
                      travelers={travelers}
                      canEdit={canEdit}
                      onDragStart={onDragStart}
                      onOpen={onOpen}
                      onKeyMove={onKeyMove}
                    />
                  ))}
                </div>
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
