"use client"

import { AdvancedMarker, AdvancedMarkerAnchorPoint } from "@vis.gl/react-google-maps"
import type { LatLng } from "@/lib/geo"

/** Where distances are measured from: a paper dot for GPS, an ink tag for a saved place. */
export function OriginMarker({
  position,
  kind,
  label,
}: {
  position: LatLng
  kind: "here" | "anchor"
  label: string
}) {
  return (
    <AdvancedMarker
      position={position}
      title={label}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      zIndex={500}
    >
      {kind === "here" ? (
        <span className="relative block size-5">
          <span className="absolute inset-0 animate-ping rounded-full bg-lime/50" />
          <span className="absolute inset-0 rounded-full border-[3px] border-ink bg-paper shadow-[0_0_0_2px_var(--lime)]" />
        </span>
      ) : (
        <span className="block whitespace-nowrap rounded-sm border-[1.5px] border-paper bg-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-paper shadow-[0_3px_10px_rgba(0,0,0,0.5)]">
          FROM: {label}
        </span>
      )}
    </AdvancedMarker>
  )
}
