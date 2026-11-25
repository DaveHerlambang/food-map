"use client"

import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  CollisionBehavior,
} from "@vis.gl/react-google-maps"
import { Bookmark, Check } from "lucide-react"
import { cn } from "cn"
import type { CSSProperties } from "react"
import type { OpenState } from "@/lib/hours"
import { pinHeader } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"

/**
 * A pin is a tiny receipt:
 *
 *   ┌─────────────────┐
 *   │▐TIL       02:00▌│  header band printed on the paper: asphalt + lime when
 *   │ NASI GORENG     │  open, Barbados when closing soon. Body: paper, or pink
 *   │ - - - - - - - - │  for a drink / dessert place.
 *   │ ✓ VISITED       │  footer: visited (check) or wishlist (bookmark)
 *   └╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱┘  torn bottom, same color as the body
 *
 * Closed and unknown pins are muted whatever their tags: no header color, no
 * shadow ("CLOSED", or a dashed outline and "HOURS ?"). Long names are cut
 * with "…". Distance lives in the list.
 *
 * Open and closing-soon pins always show; closed and unknown ones step aside
 * (hide) when they would overlap another pin, so the city view stays readable.
 */
const HEADER: Record<OpenState["status"], string> = {
  open: "bg-asphalt text-lime",
  closing: "bg-barbados text-paper",
  closed: "border-b border-dashed border-pin-dim-border font-medium text-pin-dim",
  unknown: "border-b border-dashed border-pin-dim-border font-medium text-pin-dim",
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
  const { place, state, tinted } = pin
  const dim = state.status === "closed" || state.status === "unknown"
  const [left, right] = pinHeader(state)
  const visited = place.status === "visited"
  // the body and its torn edge share one color
  const body = { "--pin-body": dim ? "var(--chrome)" : tinted ? "var(--tint)" : "var(--paper)" } as CSSProperties

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={`${place.name} · ${visited ? "visited" : "wishlist"}`}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      zIndex={selected ? 1000 : state.status === "open" ? 10 : state.status === "closing" ? 8 : 1}
      collisionBehavior={
        selected || !dim
          ? CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
          : CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY
      }
      onClick={() => onSelect(place.id)}
    >
      {/* padding = bigger tap target than the visible receipt */}
      <span className="block p-1.5">
        <span
          style={body}
          className={cn(
            "flex max-w-[13rem] flex-col font-mono leading-none transition-transform",
            // a drop shadow (not a box shadow) so the torn teeth cast one too
            // kept tight: a wide blur under the teeth reads as a grey band
            !dim && "drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]",
            selected && "scale-110",
          )}
        >
          <span
            className={cn(
              // paper all round, so the dark header reads as printed on the
              // receipt instead of melting into the dark map
              "flex min-w-[5.5rem] flex-col bg-(--pin-body) px-[3px] pt-[3px]",
              dim && "outline-1 -outline-offset-1 outline-pin-dim-border",
              state.status === "unknown" && "outline-dashed",
              selected && "shadow-[0_0_0_2px_var(--chrome),0_0_0_4px_var(--chrome-fg)]",
            )}
          >
            <span
              className={cn(
                "flex justify-between gap-2.5 rounded-[1px] px-1 py-1 text-[10px] font-bold tracking-[0.05em] tabular-nums",
                HEADER[state.status],
              )}
            >
              <span>{left}</span>
              {right && <span>{right}</span>}
            </span>
            <span
              className={cn(
                "truncate px-1 pt-[5px] pb-[3px] text-[10px] uppercase tracking-[0.05em]",
                dim ? "font-medium text-pin-dim" : "font-bold text-ink",
              )}
            >
              {place.name}
            </span>
            <span
              className={cn(
                "mx-1 flex items-center gap-1 border-t border-dashed pt-[3px] pb-0.5 text-[8px] font-semibold tracking-[0.12em]",
                dim ? "border-pin-dim-border text-pin-dim" : "border-ink/35 text-ink",
              )}
            >
              {visited ? (
                <Check aria-hidden className="size-2" strokeWidth={3.5} />
              ) : (
                <Bookmark aria-hidden className="size-2" strokeWidth={3} />
              )}
              {visited ? "VISITED" : "WISHLIST"}
            </span>
          </span>
          <span aria-hidden className="zigzag-pin" />
        </span>
      </span>
    </AdvancedMarker>
  )
}
