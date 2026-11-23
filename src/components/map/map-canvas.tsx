"use client"

import { Map } from "@vis.gl/react-google-maps"
import { SURABAYA, type LatLng } from "@/lib/geo"
import type { MapTheme } from "@/hooks/use-map-theme"

export type Camera = { center: LatLng; zoom: number }
export const DEFAULT_CAMERA: Camera = { center: SURABAYA, zoom: 13 }

/**
 * The one Map instance. Must be rendered inside <APIProvider>.
 *
 * The Map ID carries two cloud styles: a Light one and a Dark one (Struk v2
 * palette). Google only reads `colorScheme` when the map is created, so a
 * theme switch re-creates the map (key) — at `camera`, which the caller
 * captures from the old map right before switching.
 */
export function MapCanvas({
  theme,
  camera,
  children,
  onMapClick,
}: {
  theme: MapTheme
  camera: Camera
  children?: React.ReactNode
  onMapClick?: () => void
}) {
  return (
    <Map
      key={theme}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
      defaultCenter={camera.center}
      defaultZoom={camera.zoom}
      colorScheme={theme === "light" ? "LIGHT" : "DARK"}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      onClick={() => onMapClick?.()}
      className="h-full w-full"
    >
      {children}
    </Map>
  )
}
