"use client"

import { useCallback, useSyncExternalStore } from "react"

// A boolean remembered in this browser (per-viewer convenience, e.g. "panel
// hidden"). localStorage can be unavailable (private mode, blocked storage),
// so an in-memory copy keeps it working for the session either way.
const memory = new Map<string, boolean>()
const listeners = new Set<() => void>()

function read(key: string): boolean {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) return stored === "1"
  } catch {
    // storage blocked: fall through to memory
  }
  return memory.get(key) ?? false
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener("storage", onChange) // other tabs
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** [value, setValue] — false on the server and on first visit. */
export function usePersistentFlag(key: string): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  )

  const set = useCallback(
    (next: boolean) => {
      memory.set(key, next)
      try {
        window.localStorage.setItem(key, next ? "1" : "0")
      } catch {
        // storage blocked: memory copy is enough for this session
      }
      listeners.forEach((l) => l())
    },
    [key],
  )

  return [value, set]
}
