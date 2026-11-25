import { getMember } from "@/lib/auth"
import { buildExport, exportFileName } from "@/lib/export"
import { getAnchors, getPeople, getPlaces, getTags } from "@/lib/places/queries"

/**
 * GET → the whole map as a JSON file (Export data, in the map menu).
 * Members only; RLS already limits the queries to what a member may read.
 */
export async function GET() {
  if (!(await getMember())) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  try {
    const [places, tags, anchors, people] = await Promise.all([getPlaces(), getTags(), getAnchors(), getPeople()])
    const now = new Date()
    const body = buildExport({
      places,
      tags,
      anchors,
      people,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
      exportedAt: now,
    })
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(now)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[export]", err)
    return Response.json({ error: "Export failed. Try again." }, { status: 500 })
  }
}
