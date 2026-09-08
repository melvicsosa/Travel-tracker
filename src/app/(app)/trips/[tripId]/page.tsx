import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/auth";
import type { Activity, Traveler, Trip, TripMemberWithProfile } from "@/lib/database.types";
import { TripPlanner } from "@/components/trip/TripPlanner";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const profile = await requireApproved();
  const supabase = await createClient();

  const [tripRes, travelersRes, activitiesRes, membersRes] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase.from("travelers").select("*").eq("trip_id", tripId).order("position"),
    supabase.from("activities").select("*").eq("trip_id", tripId),
    supabase.rpc("trip_members_with_profiles", { p_trip_id: tripId }),
  ]);

  if (!tripRes.data) notFound();

  const members = (membersRes.data ?? []) as TripMemberWithProfile[];
  const myRole = members.find((m) => m.user_id === profile.id)?.role ?? (profile.is_admin ? "owner" : "viewer");

  return (
    <TripPlanner
      trip={tripRes.data as Trip}
      initialTravelers={(travelersRes.data ?? []) as Traveler[]}
      initialActivities={(activitiesRes.data ?? []) as Activity[]}
      initialMembers={members}
      me={{ id: profile.id, role: myRole, isAdmin: profile.is_admin }}
    />
  );
}
