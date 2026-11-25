"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { LocateFixed } from "lucide-react"
import { cn } from "cn"
import { AnchorGlyph } from "@/components/origin/anchor-icon"
import type { AnchorIcon } from "@/lib/anchor-icons"
import type { LatLng } from "@/lib/geo"

/**
 * Where distances are measured from, as a round paper stamp with a small name
 * under it: the saved place's own icon (home, work, …) with a paper pulse, or
 * a lime crosshair with a lime pulse for your live GPS. The stamp's center
 * sits on the spot.
 */
export function OriginMarker({
  position,
  kind,
  label,
  icon,
}: {
  position: LatLng
  kind: "here" | "anchor"
  label: string
  /** a saved place's icon */
  icon?: AnchorIcon
}) {
  const here = kind === "here"
  return (
    <AdvancedMarker
      position={position}
      title={here ? "You are here" : `Distances from ${label}`}
      // the stamp is 30px tall: anchor on its center, not on the label below
      anchorPoint={["50%", "15px"]}
      zIndex={500}
    >
      <span className="flex flex-col items-center gap-[3px] font-mono leading-none">
        <span
          className={cn(
            "relative flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-ink text-ink shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
            here ? "bg-lime" : "bg-paper",
          )}
        >
          {/* a pulse so the starting point stands out among the pins: lime for GPS, paper for a saved place */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 animate-ping rounded-full motion-reduce:animate-none",
              here ? "bg-lime/50" : "bg-paper/60",
            )}
          />
          {/* the inner dashed ring of a rubber stamp */}
          <span aria-hidden className="absolute inset-[3px] rounded-full border border-dashed border-ink/45" />
          {here ? (
            <LocateFixed aria-hidden className="relative size-3.5" strokeWidth={2.5} />
          ) : (
            <AnchorGlyph icon={icon ?? "pin"} className="relative size-3.5" />
          )}
        </span>
        <span className="max-w-32 truncate bg-paper px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-ink shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
          {here ? "YOU" : label}
        </span>
      </span>
    </AdvancedMarker>
  )
}
