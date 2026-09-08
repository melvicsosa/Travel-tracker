"use client";

import { createClient } from "@/lib/supabase/client";
import type { Activity, Traveler, TripRole } from "@/lib/database.types";

/**
 * Client-side writes for the planner. Every call is optimistic on the caller
 * side; realtime brings the confirmed row back.
 */
export const repo = {
  async upsertActivity(a: Activity) {
    const supabase = createClient();
    const { error } = await supabase.from("activities").upsert({
      id: a.id,
      trip_id: a.trip_id,
      title: a.title,
      place: a.place,
      notes: a.notes,
      date: a.date,
      start_min: a.start_min,
      duration_min: a.duration_min,
      category: a.category,
      booking: a.booking,
      traveler_ids: a.traveler_ids,
    });
    if (error) throw error;
  },

  async moveActivity(id: string, patch: Pick<Activity, "date" | "start_min" | "duration_min">) {
    const supabase = createClient();
    const { error } = await supabase.from("activities").update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteActivity(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertTraveler(p: Traveler) {
    const supabase = createClient();
    const { error } = await supabase.from("travelers").upsert({
      id: p.id,
      trip_id: p.trip_id,
      name: p.name,
      short_name: p.short_name,
      color: p.color,
      position: p.position,
      user_id: p.user_id,
    });
    if (error) throw error;
  },

  async deleteTraveler(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("travelers").delete().eq("id", id);
    if (error) throw error;
  },

  async addMemberByEmail(tripId: string, email: string, role: TripRole = "editor") {
    const supabase = createClient();
    const { error } = await supabase.rpc("add_trip_member_by_email", {
      p_trip_id: tripId,
      p_email: email,
      p_role: role,
    });
    if (error) throw error;
  },

  async removeMember(tripId: string, userId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("trip_members").delete().match({ trip_id: tripId, user_id: userId });
    if (error) throw error;
  },
};
