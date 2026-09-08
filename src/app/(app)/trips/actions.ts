"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/auth";

export async function createTrip(formData: FormData) {
  const profile = await requireApproved();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim() || "Viaje sin nombre";
  const place = String(formData.get("place") ?? "").trim();
  const start = String(formData.get("start") ?? "");
  let end = String(formData.get("end") ?? "");
  if (!end || end < start) end = start;

  const { data, error } = await supabase
    .from("trips")
    .insert({ name, place, start_date: start, end_date: end, created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "insert_failed");
  redirect(`/trips/${data.id}`);
}
