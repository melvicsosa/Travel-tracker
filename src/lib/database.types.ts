/**
 * Hand-written types for the schema in supabase/migrations.
 * The Supabase clients are intentionally untyped for now; rows are cast to
 * these interfaces at the call sites. Once the CLI is linked, generate the
 * real types with `supabase gen types typescript --linked` and pass the
 * generated `Database` type to createBrowserClient / createServerClient.
 */

export type UserStatus = "pending" | "approved" | "rejected";
export type TripRole = "owner" | "editor" | "viewer";
export type BookingStatus = "none" | "pending" | "confirmed";
export type ActivityCategory =
  | "transfer"
  | "food"
  | "outdoors"
  | "attraction"
  | "shopping"
  | "home"
  | "event";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  status: UserStatus;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface Trip {
  id: string;
  name: string;
  place: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  created_by: string;
  created_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: TripRole;
  added_by: string | null;
  created_at: string;
}

export interface Traveler {
  id: string;
  trip_id: string;
  name: string;
  short_name: string;
  color: string;
  user_id: string | null;
  position: number;
  created_at: string;
}

export interface Activity {
  id: string;
  trip_id: string;
  title: string;
  place: string;
  notes: string;
  date: string; // YYYY-MM-DD
  start_min: number; // minutes from midnight
  duration_min: number;
  category: ActivityCategory;
  booking: BookingStatus;
  traveler_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface TripInvite {
  trip_id: string;
  email: string;
  role: TripRole;
  invited_by: string | null;
  created_at: string;
}

export interface TripMemberWithProfile {
  user_id: string;
  role: TripRole;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}
