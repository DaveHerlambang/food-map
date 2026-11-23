import { createClient } from "@/lib/supabase/server"

/**
 * Returns the signed-in member and a Supabase client, or null.
 * Use in Route Handlers and Server Actions before doing anything that costs
 * money (Google calls) — RLS protects the database, not the Google quota.
 */
export async function getMember() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null

  const { data: member } = await supabase
    .from("members")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()
  if (!member) return null

  return { supabase, userId }
}
