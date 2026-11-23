"use client"

import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  CollisionBehavior,
} from "@vis.gl/react-google-maps"
import { cn } from "cn"
import type { OpenState } from "@/lib/hours"
import { pinLabel } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"

/**
 * A pin is one rectangle in two parts: until when you can go, and what it is.
 *
 *   [ 02:00 | NASI GORENG CAK MAN ]
 *
 * Left (time): lime when open ("02:00" / "24H"), Barbados red when closing soon,
 * muted "CLOSED" or dashed "--:--" otherwise. Right (name): paper and ink,
 * truncated with "…" so long names stay short. Distance lives in the list.
 *
 * Open and closing-soon pins always show; closed and unknown ones step aside
 * (hide) when they would overlap another pin, so the city view stays readable.
 */
const TIME: Record<OpenState["status"], string> = {
  open: "bg-lime text-ink",
  closing: "bg-barbados text-paper",
  closed: "bg-chrome text-pin-dim text-[10px] font-medium",
  unknown: "bg-chrome text-pin-dim text-[10px] font-medium",
}

export function PlaceMarker({
  pin,
  selected,
  onSelect,
}: {
  pin: Pin
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { place, state } = pin
  const dim = state.status === "closed" || state.status === "unknown"

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      zIndex={selected ? 1000 : state.status === "open" ? 10 : state.status === "closing" ? 8 : 1}
      collisionBehavior={
        selected || !dim
          ? CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
          : CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY
      }
      onClick={() => onSelect(place.id)}
    >
      {/* padding = bigger tap target than the visible rectangle */}
      <span className="block p-1.5">
        <span
          className={cn(
            "flex max-w-[13rem] items-stretch overflow-hidden rounded-[3px] border-[1.5px] font-mono leading-none shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform",
            // ink border keeps it readable on the light map; on the dark map it disappears
            dim ? "border-pin-dim-border shadow-none" : "border-ink",
            state.status === "unknown" && "border-dashed",
            selected && "scale-110 shadow-[0_0_0_2px_var(--chrome),0_0_0_4px_var(--chrome-fg)]",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center px-1.5 py-[3px] text-[11px] font-bold tabular-nums",
              TIME[state.status],
            )}
          >
            {pinLabel(state)}
          </span>
          <span
            className={cn(
              "min-w-0 truncate border-l-[1.5px] px-1.5 py-[3px] text-[10px] uppercase tracking-[0.02em]",
              dim
                ? "border-pin-dim-border bg-chrome font-medium text-pin-dim"
                : "border-ink bg-paper font-bold text-ink",
            )}
          >
            {place.name}
          </span>
        </span>
      </span>
    </AdvancedMarker>
  )
}
