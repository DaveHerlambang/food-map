import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabasePublishableKey, supabaseUrl } from "./env"

/**
 * Refreshes the Supabase session cookie and gates the app behind login.
 * Called from src/proxy.ts on every matched request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // getClaims() verifies the JWT; don't run code between createServerClient
  // and this call, or sessions can drop randomly.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const onLogin = request.nextUrl.pathname === "/login"

  if (signedIn !== !onLogin) {
    // signed out outside /login, or signed in on /login
    const url = request.nextUrl.clone()
    url.pathname = signedIn ? "/" : "/login"
    url.search = ""
    const redirect = NextResponse.redirect(url)
    // keep any refreshed session cookies on the redirect
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return response
}
