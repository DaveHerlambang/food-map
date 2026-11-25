"use client"

import { useMap } from "@vis.gl/react-google-maps"
import { LocateFixed } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LatLng } from "@/lib/geo"

/**
 * Adding a place by hand, step 1: the pin stays in the middle of the screen
 * and you move the map under it, then name the place.
 */
export function PinPicker({
  initialName,
  position,
  onLocate,
  onCancel,
  onNext,
}: {
  initialName: string
  /** your GPS fix, if any */
  position: LatLng | null
  /** asks for a GPS fix */
  onLocate: () => void
  onCancel: () => void
  onNext: (name: string, at: LatLng) => void
}) {
  const map = useMap()
  const [name, setName] = useState(initialName)

  // "Use my location" before there is a fix: pan once it arrives.
  const panOnFix = useRef(false)
  useEffect(() => {
    if (panOnFix.current && position && map) {
      panOnFix.current = false
      map.panTo(position)
      if ((map.getZoom() ?? 0) < 17) map.setZoom(17)
    }
  }, [position, map])

  function locate() {
    if (position && map) {
      map.panTo(position)
      if ((map.getZoom() ?? 0) < 17) map.setZoom(17)
      return
    }
    panOnFix.current = true
    onLocate()
  }

  function next() {
    const center = map?.getCenter()
    if (!center || !name.trim()) return
    onNext(name.trim(), { lat: center.lat(), lng: center.lng() })
  }

  return (
    <>
      {/* The pin: its dot sits exactly on the map's center. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex flex-col items-center font-mono leading-none"
        style={{ transform: "translate(-50%, calc(-100% + 6px))" }}
      >
        <span className="flex flex-col drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]">
          <span className="flex min-w-[6rem] max-w-[13rem] flex-col bg-paper px-[3px] pt-[3px]">
            <span className="flex justify-between gap-2.5 rounded-[1px] bg-asphalt px-1 py-1 text-[10px] font-bold tracking-[0.05em] text-lime">
              <span>NEW</span>
              <span>PLACE</span>
            </span>
            <span className="truncate px-1 pb-[3px] pt-[5px] text-[10px] font-bold uppercase tracking-[0.05em] text-ink">
              {name.trim() || "NAME IT BELOW"}
            </span>
          </span>
          <span className="zigzag-pin" />
        </span>
        <span className="h-3.5 w-0.5 bg-paper shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" />
        <span className="size-3 rounded-full bg-lime shadow-[0_0_0_2px_var(--ink)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 font-mono lg:bottom-6 lg:left-1/2 lg:right-auto lg:w-[26rem] lg:-translate-x-1/2">
        <span aria-hidden className="zigzag-top block" />
        <div className="flex flex-col gap-3 bg-paper p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Move the map to place the pin</p>
            <button
              type="button"
              onClick={locate}
              aria-label="Use my location"
              title="Use my location"
              className="flex size-11 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-ink hover:bg-paper-2"
            >
              <LocateFixed className="size-5" />
            </button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  next()
                }
              }}
              maxLength={80}
              placeholder="e.g. Warung Bu Tin"
              className="h-11 text-base"
            />
          </label>
          <div className="flex gap-1.5">
            <Button variant="outline" onClick={onCancel} className="h-12 px-4 text-xs">
              Cancel
            </Button>
            <Button onClick={next} disabled={!name.trim()} className="h-12 flex-1 text-sm">
              Next: opening hours
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
