"use client"

import { AdvancedMarker, AdvancedMarkerAnchorPoint } from "@vis.gl/react-google-maps"
import { cn } from "cn"
import { pinLabel } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"

/**
 * Pins are little paper price tags on the map (light or dark).
 *   open, visited   → paper tag, lime square, distance
 *   open, wishlist  → dashed outline tag, lime square
 *   closing soon    → paper tag, Barbados square + closing time
 *   closed          → small "VOID"
 *   hours unknown   → small dashed "?"
 */
export function PlaceMarker({
  pin,
  selected,
  onSelect,
}: {
  pin: Pin
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { place, state, trip } = pin
  const label = pinLabel(state, trip)
  const open = state.status === "open"
  const soon = state.status === "closing"
  const dim = state.status === "closed" || state.status === "unknown"
  const wishlist = place.status === "wishlist"

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      zIndex={selected ? 1000 : dim ? 1 : soon ? 5 : 10}
      onClick={() => onSelect(place.id)}
    >
      {/* padding = bigger tap target than the visible tag */}
      <span className="block p-1.5">
        {dim ? (
          <span
            className={cn(
              "block rounded-sm border border-pin-dim-border bg-chrome px-1.5 py-px font-mono text-[10px] text-pin-dim",
              state.status === "unknown" && "border-dashed",
              selected && "border-lime text-chrome-fg shadow-[0_0_0_2px_var(--lime)]",
            )}
          >
            {label}
          </span>
        ) : (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] font-bold transition-transform",
              wishlist && !soon
                ? "border-[1.5px] border-dashed border-chrome-fg bg-chrome text-chrome-fg"
                : // ink border: invisible on the dark map, needed on the light one
                  "border-[1.5px] border-ink bg-paper shadow-[0_3px_10px_rgba(0,0,0,0.35)]",
              soon ? "text-barbados" : !wishlist && "text-ink",
              selected && "scale-110 shadow-[0_0_0_3px_var(--lime),0_6px_16px_rgba(0,0,0,0.5)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-[9px] shrink-0",
                open && "bg-lime shadow-[inset_0_0_0_1.5px_var(--ink)]",
                soon && "bg-barbados",
              )}
            />
            {label}
          </span>
        )}
      </span>
    </AdvancedMarker>
  )
}
