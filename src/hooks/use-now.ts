"use client"

import { useSyncExternalStore } from "react"

// A shared clock that ticks every 30s and when the tab becomes visible again
// (phones freeze timers in background tabs). Returns null during SSR so the
// server never renders time-dependent open/closed states.
let now = 0

function subscribe(onChange: () => void) {
  const tick = () => {
    now = Date.now()
    onChange()
  }
  const id = window.setInterval(tick, 30_000)
  const onVisible = () => document.visibilityState === "visible" && tick()
  document.addEventListener("visibilitychange", onVisible)
  return () => {
    window.clearInterval(id)
    document.removeEventListener("visibilitychange", onVisible)
  }
}

function getSnapshot() {
  if (now === 0) now = Date.now()
  return now
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
