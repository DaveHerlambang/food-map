// Fail loudly with a readable message instead of a cryptic Supabase error.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name} (check .env.local)`)
  return value
}

// Must be read as literal `process.env.NEXT_PUBLIC_*` so Next can inline them.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
export const supabasePublishableKey = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
