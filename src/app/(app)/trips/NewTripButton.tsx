"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PlusIcon } from "@/components/ui/Icons";
import { t } from "@/lib/i18n";
import { toYMD } from "@/lib/time";
import { createTrip } from "./actions";

export function NewTripButton() {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const inAWeek = new Date();
  inAWeek.setDate(inAWeek.getDate() + 6);

  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t.trips.create}
      </button>
      {open ? (
        <Sheet title={t.trips.createTitle} subtitle={t.trips.emptyHint} onClose={() => setOpen(false)}>
          <form action={createTrip} className="flex flex-col gap-3">
            <div className="field">
              <label htmlFor="t-name">{t.trips.name}</label>
              <input id="t-name" name="name" type="text" placeholder={t.trips.namePlaceholder} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="t-place">{t.trips.place}</label>
              <input id="t-place" name="place" type="text" placeholder={t.trips.placePlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="t-start">{t.trips.start}</label>
                <input id="t-start" name="start" type="date" defaultValue={toYMD(today)} required />
              </div>
              <div className="field">
                <label htmlFor="t-end">{t.trips.end}</label>
                <input id="t-end" name="end" type="date" defaultValue={toYMD(inAWeek)} required />
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                {t.activity.cancel}
              </button>
              <button type="submit" className="btn primary">
                {t.trips.create}
              </button>
            </div>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}
