"use client"

import { useCallback, useEffect, useState } from "react"
import type { LatLng } from "@/lib/geo"

export type GeoStatus = "idle" | "locating" | "ok" | "denied" | "unavailable"

export type Geo = {
  status: GeoStatus
  position: LatLng | null
  /** metres */
  accuracy: number | null
  locate: () => void
}

/**
 * Browser location, on demand. One-shot getCurrentPosition (not
 * watchPosition, which drains the battery). Locates automatically on load
 * only if permission was already granted, so there's no surprise prompt.
 */
export function useGeolocation(): Geo {
  const [state, setState] = useState<Omit<Geo, "locate">>({
    status: "idle",
    position: null,
    accuracy: null,
  })

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unavailable" }))
      return
    }
    setState((s) => ({ ...s, status: "locating" }))
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setState({
          status: "ok",
          position: { lat: p.coords.latitude, lng: p.coords.longitude },
          accuracy: p.coords.accuracy,
        }),
      // keep the last known position if a refresh fails
      (err) =>
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        })),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (!cancelled && p.state === "granted") locate()
      })
      .catch(() => {}) // Permissions API missing (older iOS): wait for a tap
    return () => {
      cancelled = true
    }
  }, [locate])

  return { ...state, locate }
}
