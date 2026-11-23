"use client"

import { useSyncExternalStore } from "react"

/**
 * Pixels at the bottom of the screen that content must stay clear of: the iPhone
 * home indicator and, when it sits on top of the page, Safari's bottom bar.
 *
 * Two measurements, and the larger wins:
 *  - env(safe-area-inset-bottom), read through a hidden probe element
 *  - the part of the layout viewport lying below the visible area (visualViewport)
 *
 * The second one is ignored while pinch-zoomed, and when it is large enough to be
 * the on-screen keyboard rather than a toolbar.
 */
let inset = 0
let probe: HTMLDivElement | null = null

function measure(): number {
  if (!probe) {
    probe = document.createElement("div")
    probe.setAttribute("aria-hidden", "true")
    probe.style.cssText =
      "position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)"
    document.body.appendChild(probe)
  }
  const safe = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0

  let covered = 0
  const vv = window.visualViewport
  if (vv && Math.abs(vv.scale - 1) < 0.01) {
    const hidden = document.documentElement.clientHeight - (vv.height + vv.offsetTop)
    if (hidden > 0 && hidden <= 120) covered = hidden
  }
  return Math.round(Math.max(safe, covered))
}

function subscribe(onChange: () => void) {
  const update = () => {
    const next = measure()
    if (next !== inset) {
      inset = next
      onChange()
    }
  }
  inset = measure()
  window.addEventListener("resize", update)
  window.addEventListener("orientationchange", update)
  window.visualViewport?.addEventListener("resize", update)
  window.visualViewport?.addEventListener("scroll", update)
  return () => {
    window.removeEventListener("resize", update)
    window.removeEventListener("orientationchange", update)
    window.visualViewport?.removeEventListener("resize", update)
    window.visualViewport?.removeEventListener("scroll", update)
  }
}

/** 0 on the server and on desktop. */
export function useBottomInset(): number {
  return useSyncExternalStore(
    subscribe,
    () => inset,
    () => 0,
  )
}
