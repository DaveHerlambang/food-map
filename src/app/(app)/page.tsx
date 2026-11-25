import { connection } from "next/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SplashScreen } from "@/components/receipt/splash-screen"
import { MapShell } from "@/components/map/map-shell"
import { getMember } from "@/lib/auth"
import { getAnchors, getPeople, getPlaces, getTags } from "@/lib/places/queries"

// Each segment needs its own <Suspense> around request-time data (Cache
// Components validates segments independently).
export default function HomePage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <PlacesMap />
    </Suspense>
  )
}

async function PlacesMap() {
  // Supabase checks token expiry with Date.now(): request-time work only.
  await connection()
  const member = await getMember()
  if (!member) redirect("/login") // layout shows "not set up" for non-members anyway
  const [places, tags, anchors, people] = await Promise.all([
    getPlaces(),
    getTags(),
    getAnchors(),
    getPeople(),
  ])
  return (
    <MapShell places={places} tags={tags} anchors={anchors} people={people} userId={member.userId} />
  )
}
