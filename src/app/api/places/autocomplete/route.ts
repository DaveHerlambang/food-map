import { getMember } from "@/lib/auth"
import { isUuid, SURABAYA } from "@/lib/geo"
import { autocomplete } from "@/lib/google/places"

/**
 * POST { input, sessionToken, lat?, lng? } → { suggestions }
 * A Route Handler (not a Server Action) so type-ahead requests can run in
 * parallel and be aborted by the client.
 */
export async function POST(request: Request) {
  if (!(await getMember())) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const input = typeof body?.input === "string" ? body.input.trim() : ""
  const sessionToken = body?.sessionToken

  if (input.length < 3 || input.length > 100 || !isUuid(sessionToken)) {
    return Response.json({ suggestions: [] })
  }

  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  const bias = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : SURABAYA

  try {
    const suggestions = await autocomplete(input, sessionToken, bias)
    return Response.json({ suggestions })
  } catch (err) {
    console.error("[autocomplete]", err)
    return Response.json({ error: "Search failed. Try again." }, { status: 502 })
  }
}
