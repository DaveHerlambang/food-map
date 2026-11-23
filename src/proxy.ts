import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Skip static files, images, and the cron route (it uses CRON_SECRET instead).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
