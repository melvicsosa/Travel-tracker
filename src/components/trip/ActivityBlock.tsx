"use client";

import { useRef } from "react";
import type { Activity, Traveler } from "@/lib/database.types";
import { DAY_START, formatTime } from "@/lib/time";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import type { Placement } from "@/lib/trip/layout";

export type DragStart = (
  e: React.PointerEvent<HTMLDivElement>,
  activity: Activity,
  mode: "move" | "resize",
  el: HTMLDivElement,
) => void;

export function ActivityBlock({
  activity,
  pxPerMin,
  placement,
  travelers,
  canEdit,
  onDragStart,
  onOpen,
  onKeyMove,
}: {
  activity: Activity;
  pxPerMin: number;
  placement?: Placement;
  travelers: Traveler[];
  canEdit: boolean;
  onDragStart: DragStart;
  onOpen: (a: Activity) => void;
  onKeyMove: (a: Activity, dMin: number, dDay: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const a = activity;
  const height = a.duration_min * pxPerMin;
  const top = (a.start_min - DAY_START) * pxPerMin;
  const compact = pxPerMin < 0.9;
  const tiny = height < 40;
  const cols = placement && placement.cols > 1 ? placement.cols : 1;
  const col = placement?.col ?? 0;

  const style: React.CSSProperties = {
    ["--ac" as string]: `var(--c-${a.category})`,
    ["--bg" as string]: `var(--c-${a.category}-bg)`,
    top,
    height: Math.max(18, height - 2),
    left: cols > 1 ? `${col * (100 / cols)}%` : 2,
    right: cols > 1 ? "auto" : 2,
    width: cols > 1 ? `calc(${100 / cols}% - 3px)` : "auto",
  };

  const who = a.traveler_ids
    .map((id) => travelers.find((p) => p.id === id))
    .filter((p): p is Traveler => Boolean(p));

  return (
    <div
      ref={ref}
      className={`actblock${tiny ? " tiny" : ""}${canEdit ? "" : " readonly"}`}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`${a.title}, ${formatTime(a.start_min)}`}
      data-act={a.id}
      onPointerDown={(e) => {
        if (!ref.current) return;
        const target = e.target as HTMLElement;
        const mode = target.classList.contains("rz") ? "resize" : "move";
        onDragStart(e, a, canEdit ? mode : "move", ref.current);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(a);
        } else if (canEdit && e.key === "ArrowUp") {
          e.preventDefault();
          onKeyMove(a, -15, 0);
        } else if (canEdit && e.key === "ArrowDown") {
          e.preventDefault();
          onKeyMove(a, 15, 0);
        } else if (canEdit && e.key === "ArrowLeft") {
          e.preventDefault();
          onKeyMove(a, 0, -1);
        } else if (canEdit && e.key === "ArrowRight") {
          e.preventDefault();
          onKeyMove(a, 0, 1);
        }
      }}
    >
      {a.booking === "pending" ? (
        <span className={`flag${compact ? " dot" : ""}`} title={t.booking.pending}>
          {compact ? "" : t.booking.flag}
        </span>
      ) : null}
      <span className="bh mono">
        {formatTime(a.start_min)}
        {tiny || compact ? "" : ` – ${formatTime(a.start_min + a.duration_min)}`}
      </span>
      <span className="bt">{a.title}</span>
      {!tiny && a.place && height > 76 ? <span className="bp">{a.place}</span> : null}
      {!tiny && who.length > 0 && height > 92 ? (
        <span className="who">
          {who.map((p) => (
            <Avatar key={p.id} short={p.short_name} color={p.color} name={p.name} />
          ))}
        </span>
      ) : null}
      {canEdit ? <span className="rz" aria-hidden="true" /> : null}
    </div>
  );
}
