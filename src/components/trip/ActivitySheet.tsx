"use client";

import { useState } from "react";
import type { Activity, ActivityCategory, BookingStatus, Traveler } from "@/lib/database.types";
import { CATEGORIES } from "@/lib/categories";
import { t } from "@/lib/i18n";
import { SNAP, minutesToTimeInput, monthShort, snap, timeInputToMinutes, toYMD, weekdayShort } from "@/lib/time";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";

const BOOKINGS: BookingStatus[] = ["none", "pending", "confirmed"];

export function ActivitySheet({
  activity,
  isNew,
  days,
  travelers,
  canEdit,
  onSave,
  onDelete,
  onClose,
}: {
  activity: Activity;
  isNew: boolean;
  days: Date[];
  travelers: Traveler[];
  canEdit: boolean;
  onSave: (a: Activity) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: activity.title,
    place: activity.place,
    notes: activity.notes,
    date: activity.date,
    category: activity.category,
    booking: activity.booking,
    start: minutesToTimeInput(activity.start_min),
    end: minutesToTimeInput(activity.start_min + activity.duration_min),
    travelerIds: [...activity.traveler_ids],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const startMin = snap(Math.max(0, timeInputToMinutes(form.start)));
    let endMin = timeInputToMinutes(form.end);
    if (endMin <= startMin) endMin = startMin + 60;
    onSave({
      ...activity,
      title: form.title.trim() || t.activity.untitled,
      place: form.place.trim(),
      notes: form.notes.trim(),
      date: form.date,
      category: form.category,
      booking: form.booking,
      start_min: startMin,
      duration_min: Math.max(SNAP, snap(endMin - startMin)),
      traveler_ids: form.travelerIds,
    });
  }

  const ro = !canEdit;

  return (
    <Sheet
      title={isNew ? t.activity.newTitle : t.activity.editTitle}
      subtitle={ro ? t.common.readOnly : t.activity.editHint}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="field">
          <label htmlFor="a-title">{t.activity.title}</label>
          <input id="a-title" type="text" value={form.title} placeholder={t.activity.titlePlaceholder}
            onChange={(e) => set("title", e.target.value)} readOnly={ro} autoFocus={isNew} />
        </div>
        <div className="field">
          <label htmlFor="a-place">{t.activity.place}</label>
          <input id="a-place" type="text" value={form.place} placeholder={t.activity.placePlaceholder}
            onChange={(e) => set("place", e.target.value)} readOnly={ro} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="a-date">{t.activity.day}</label>
            <select id="a-date" value={form.date} onChange={(e) => set("date", e.target.value)} disabled={ro}>
              {days.map((d) => {
                const k = toYMD(d);
                return (
                  <option key={k} value={k}>
                    {weekdayShort(d)} {d.getDate()} {monthShort(d)}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field">
            <label htmlFor="a-cat">{t.activity.category}</label>
            <select id="a-cat" value={form.category} onChange={(e) => set("category", e.target.value as ActivityCategory)} disabled={ro}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t.category[c]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="a-start">{t.activity.from}</label>
            <input id="a-start" type="time" step={900} value={form.start} onChange={(e) => set("start", e.target.value)} readOnly={ro} />
          </div>
          <div className="field">
            <label htmlFor="a-end">{t.activity.to}</label>
            <input id="a-end" type="time" step={900} value={form.end} onChange={(e) => set("end", e.target.value)} readOnly={ro} />
          </div>
        </div>

        <div className="field">
          <label>{t.activity.who}</label>
          {travelers.length === 0 ? (
            <span className="text-xs text-ink-3">{t.activity.whoEmpty}</span>
          ) : (
            <div className="chips">
              {travelers.map((p) => {
                const on = form.travelerIds.includes(p.id);
                return (
                  <button type="button" key={p.id} className={`chip${on ? " on" : ""}`} disabled={ro}
                    onClick={() => set("travelerIds", on ? form.travelerIds.filter((x) => x !== p.id) : [...form.travelerIds, p.id])}>
                    <Avatar short={p.short_name} color={p.color} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="field">
          <label>{t.activity.booking}</label>
          <div className="chips">
            {BOOKINGS.map((b) => (
              <button type="button" key={b} className={`chip${form.booking === b ? " on" : ""}`} disabled={ro}
                onClick={() => set("booking", b)}>
                {t.booking[b]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="a-notes">{t.activity.notes}</label>
          <textarea id="a-notes" value={form.notes} placeholder={t.activity.notesPlaceholder}
            onChange={(e) => set("notes", e.target.value)} readOnly={ro} />
        </div>

        <div className="actions">
          {!isNew && canEdit ? (
            <button type="button" className="btn danger" onClick={() => onDelete(activity.id)}>
              {t.activity.delete}
            </button>
          ) : null}
          <span className="flex-1" />
          <button type="button" className="btn ghost" onClick={onClose}>
            {canEdit ? t.activity.cancel : t.common.close}
          </button>
          {canEdit ? (
            <button type="submit" className="btn primary">
              {isNew ? t.activity.add : t.activity.save}
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
