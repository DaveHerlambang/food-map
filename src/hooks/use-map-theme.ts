"use client"

import { useEffect } from "react"
import { usePersistentFlag } from "./use-persistent-flag"

/** localStorage key; also read by the inline script in the root layout. */
export const MAP_THEME_KEY = "foodmap.lightMap"

export type MapTheme = "light" | "dark"

/**
 * Light/dark map theme, remembered in this browser. Dark is the default
 * (the app is mostly used at night). Mirrors the choice onto
 * <html data-map-theme> so CSS tokens for on-map elements switch too.
 */
export function useMapTheme(): [MapTheme, (theme: MapTheme) => void] {
  const [light, setLight] = usePersistentFlag(MAP_THEME_KEY)
  const theme: MapTheme = light ? "light" : "dark"

  useEffect(() => {
    document.documentElement.dataset.mapTheme = theme
  }, [theme])

  return [theme, (next) => setLight(next === "light")]
}
