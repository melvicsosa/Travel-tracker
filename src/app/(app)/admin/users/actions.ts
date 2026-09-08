"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { UserStatus } from "@/lib/database.types";

export async function setUserStatus(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as UserStatus;
  if (!userId || !["approved", "rejected", "pending"].includes(status)) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_status", { p_user_id: userId, p_status: status });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}
