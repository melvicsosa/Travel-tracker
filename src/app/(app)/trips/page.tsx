import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { daysBetween, formatRange } from "@/lib/time";
import type { Trip } from "@/lib/database.types";
import { NewTripButton } from "./NewTripButton";

export const metadata = { title: t.trips.title };

export default async function TripsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("trips").select("*").order("start_date", { ascending: false });
  const trips = (data ?? []) as Trip[];

  return (
    <main className="w-full max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{t.trips.title}</h1>
        <div className="flex-1" />
        <NewTripButton />
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-16 text-ink-3 flex flex-col gap-2 items-center">
          <h2 className="text-xl text-ink">{t.trips.empty}</h2>
          <p className="text-sm max-w-sm">{t.trips.emptyHint}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="block rounded-xl border border-line bg-surface p-4 hover:shadow-[var(--shadow)] transition-shadow"
              >
                <div className="font-display font-bold text-lg leading-tight">{trip.name}</div>
                <div className="text-ink-3 text-sm mt-1">
                  {trip.place ? `${trip.place} · ` : ""}
                  {formatRange(trip.start_date, trip.end_date)} ·{" "}
                  {t.trips.days(daysBetween(trip.start_date, trip.end_date).length)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
