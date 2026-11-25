"use client"

import { AdvancedMarker, AdvancedMarkerAnchorPoint } from "@vis.gl/react-google-maps"
import { cn } from "cn"
import type { CSSProperties } from "react"
import type { LatLng } from "@/lib/geo"

/**
 * A group of pins that would overlap, as a little pile of receipts: the dark
 * band says how many are open, the paper how many places are in the pile.
 * Muted when none is open. Tap it to zoom in until they come apart.
 */
export function ClusterMarker({
  position,
  total,
  open,
  onClick,
}: {
  position: LatLng
  total: number
  open: number
  onClick: () => void
}) {
  const muted = open === 0
  const body = { "--pin-body": muted ? "var(--chrome)" : "var(--paper)" } as CSSProperties
  const sheet = cn(
    "absolute inset-x-0 top-0 bottom-[6px] border",
    muted ? "border-pin-dim-border bg-(--chrome)" : "border-ink/30",
  )

  return (
    <AdvancedMarker
      position={position}
      title={`${total} places, ${open} open. Tap to zoom in.`}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      zIndex={muted ? 2 : 20}
      onClick={onClick}
    >
      {/* padding = bigger tap target than the visible pile */}
      <span className="block p-2">
        <span
          style={body}
          className={cn("relative block font-mono leading-none", !muted && "drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]")}
        >
          {/* the two receipts underneath, peeking out up and to the right */}
          <span aria-hidden className={cn(sheet, "translate-x-2 -translate-y-2", !muted && "bg-[#cfc8b8]")} />
          <span aria-hidden className={cn(sheet, "translate-x-1 -translate-y-1", !muted && "bg-[#dcd6c8]")} />
          <span
            className={cn(
              "relative flex min-w-[3.75rem] flex-col bg-(--pin-body) px-[2px] pt-[2px]",
              muted && "outline-1 -outline-offset-1 outline-pin-dim-border",
            )}
          >
            <span
              className={cn(
                "rounded-[1px] px-1 py-[3px] text-center text-[9px] font-bold tracking-[0.08em] whitespace-nowrap",
                muted ? "border-b border-dashed border-pin-dim-border text-pin-dim" : "bg-asphalt text-lime",
              )}
            >
              {muted ? "CLOSED" : `${open} OPEN`}
            </span>
            <span className={cn("px-1 pt-1 pb-[2px] text-center text-[13px] font-bold", muted ? "text-pin-dim" : "text-ink")}>
              {total}
              <span className="mt-0.5 block text-[7px] tracking-[0.14em]">PLACES</span>
            </span>
          </span>
          <span aria-hidden className="zigzag-pin relative" />
        </span>
      </span>
    </AdvancedMarker>
  )
}
