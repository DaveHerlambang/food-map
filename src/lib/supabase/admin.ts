import "server-only"
import { createClient } from "@supabase/supabase-js"
import { supabaseUrl } from "./env"

/**
 * Admin client: uses the SECRET key, which bypasses row-level security. Only for
 * work with no signed-in user (the daily cron). Never import this from a client
 * component (`server-only` makes the build fail if someone does), and never pass
 * it user input as a filter without validating it.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Missing environment variable: SUPABASE_SECRET_KEY")
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
