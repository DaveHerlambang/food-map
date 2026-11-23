"use client"

import { useCallback, useSyncExternalStore } from "react"

/** Live CSS media query match. false during SSR (mobile-first). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Web layout (side panel) from this width up; below it, the mobile bottom sheet. */
export const DESKTOP_QUERY = "(min-width: 1024px)"
