"use client";

import { useState } from "react";
import type { Trip } from "@/lib/database.types";
import { t } from "@/lib/i18n";
import { COMMON_TIMEZONES } from "@/lib/time";
import { Sheet } from "@/components/ui/Sheet";

/** Owner-only: rename, move dates, pick the time zone, delete the trip. */
export function TripSettingsSheet({
  trip,
  onSave,
  onDelete,
  onClose,
}: {
  trip: Trip;
  onSave: (patch: Pick<Trip, "name" | "place" | "start_date" | "end_date" | "timezone">) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: trip.name,
    place: trip.place,
    start_date: trip.start_date,
    end_date: trip.end_date,
    timezone: trip.timezone || "America/New_York",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  let zones = COMMON_TIMEZONES;
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (all?.length) zones = Array.from(new Set([...COMMON_TIMEZONES, ...all]));
  } catch {}

  return (
    <Sheet title={t.settings.title} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const end = form.end_date < form.start_date ? form.start_date : form.end_date;
          onSave({ ...form, name: form.name.trim() || trip.name, place: form.place.trim(), end_date: end });
        }}
      >
        <div className="field">
          <label htmlFor="ts-name">{t.trips.name}</label>
          <input id="ts-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="ts-place">{t.trips.place}</label>
          <input id="ts-place" type="text" value={form.place} onChange={(e) => set("place", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="ts-start">{t.trips.start}</label>
            <input id="ts-start" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ts-end">{t.trips.end}</label>
            <input id="ts-end" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ts-tz">{t.settings.timezone}</label>
          <select id="ts-tz" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
          <span className="text-xs text-ink-3">{t.settings.timezoneHint}</span>
        </div>
        <div className="actions">
          <button type="button" className="btn danger" onClick={() => { if (window.confirm(t.settings.deleteConfirm)) onDelete(); }}>
            {t.settings.delete}
          </button>
          <span className="flex-1" />
          <button type="button" className="btn ghost" onClick={onClose}>{t.activity.cancel}</button>
          <button type="submit" className="btn primary">{t.settings.save}</button>
        </div>
      </form>
    </Sheet>
  );
}
