"use server"

import { refresh } from "next/cache"
import { getMember } from "@/lib/auth"
import { isLatLng, isUuid, type LatLng } from "@/lib/geo"
import { getPlaceLocation } from "@/lib/google/places"
import { anchorIconOf, isAnchorIcon, type AnchorIcon } from "@/lib/anchor-icons"
import type { Anchor } from "@/lib/places/types"

const ANCHOR_SELECT = "id, name, lat, lng, icon"
const toAnchor = (row: Omit<Anchor, "icon"> & { icon: string | null }): Anchor => ({
  ...row,
  icon: anchorIconOf(row.icon),
})

type Fail = { ok: false; error: string }

/** Looks up a searched place's coordinates (cheap Essentials call). */
export async function resolvePlaceLocation(
  googlePlaceId: string,
  sessionToken: string,
): Promise<({ ok: true; address: string | null } & LatLng) | Fail> {
  if (!(await getMember())) return { ok: false, error: "Not signed in." }
  if (typeof googlePlaceId !== "string" || !/^[\w-]{10,300}$/.test(googlePlaceId)) {
    return { ok: false, error: "Invalid place." }
  }
  try {
    const place = await getPlaceLocation(
      googlePlaceId,
      isUuid(sessionToken) ? sessionToken : undefined,
    )
    return {
      ok: true,
      lat: place.location.latitude,
      lng: place.location.longitude,
      address: place.formattedAddress ?? null,
    }
  } catch (err) {
    console.error("[anchors] resolve", err)
    return { ok: false, error: "Couldn't load this place from Google. Try again." }
  }
}

export async function createAnchor(input: {
  name: string
  lat: number
  lng: number
  icon: AnchorIcon
}): Promise<{ ok: true; anchor: Anchor } | Fail> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }

  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : ""
  if (!name || name.length > 40) return { ok: false, error: "Names are 1–40 characters." }
  if (!isLatLng(input.lat, input.lng)) return { ok: false, error: "Pick a location first." }
  if (!isAnchorIcon(input.icon)) return { ok: false, error: "Pick an icon." }

  const { data, error } = await member.supabase
    .from("anchors")
    .insert({ name, lat: input.lat, lng: input.lng, icon: input.icon })
    .select(ANCHOR_SELECT)
    .single()
  if (error) {
    console.error("[anchors] create", error)
    return { ok: false, error: "Couldn't save the location." }
  }

  refresh()
  return { ok: true, anchor: toAnchor(data) }
}

export async function setAnchorIcon(id: number, icon: AnchorIcon): Promise<{ ok: true } | Fail> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Invalid location." }
  if (!isAnchorIcon(icon)) return { ok: false, error: "Pick an icon." }

  const { error } = await member.supabase.from("anchors").update({ icon }).eq("id", id)
  if (error) {
    console.error("[anchors] icon", error)
    return { ok: false, error: "Couldn't change the icon." }
  }

  refresh()
  return { ok: true }
}

export async function deleteAnchor(id: number): Promise<{ ok: true } | Fail> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Invalid location." }

  const { error } = await member.supabase.from("anchors").delete().eq("id", id)
  if (error) {
    console.error("[anchors] delete", error)
    return { ok: false, error: "Couldn't delete the location." }
  }

  refresh()
  return { ok: true }
}
