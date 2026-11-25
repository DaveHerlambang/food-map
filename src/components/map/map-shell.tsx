"use client"

import { APIProvider, useMap } from "@vis.gl/react-google-maps"
import { ChevronDown, LocateFixed } from "lucide-react"
import { cn } from "cn"
import { useEffect, useMemo, useRef, useState } from "react"
import { AddPlaceDrawer } from "@/components/add-place/add-place-drawer"
import { PinPicker } from "@/components/add-place/pin-picker"
import { HoursDrawer, NewPlaceHoursDrawer, type NewPlace } from "@/components/hours/hours-drawer"
import { EditPlaceDrawer } from "@/components/edit-place/edit-place-drawer"
import { FiltersDrawer } from "@/components/filters/filters-drawer"
import { OriginDrawer } from "@/components/origin/origin-drawer"
import { Mark, StatusText } from "@/components/receipt/receipt"
import { PlaceDetail, PlaceHeader } from "@/components/sheet/place-detail"
import { PlaceList } from "@/components/sheet/place-list"
import {
  PanelTab,
  PlaceSheet,
  sheetHeightPx,
  SidePanel,
  type SheetLevel,
} from "@/components/sheet/place-sheet"
import { CollapsedBar, ReceiptHeader, ReceiptTitle } from "@/components/sheet/receipt-header"
import { useFilters } from "@/hooks/use-filters"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useMapTheme } from "@/hooks/use-map-theme"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { usePersistentFlag } from "@/hooks/use-persistent-flag"
import { useNow } from "@/hooks/use-now"
import { activeFilterCount, resolveTarget, targetLabel } from "@/lib/filters"
import type { LatLng } from "@/lib/geo"
import { pinLabel, pinStatus } from "@/lib/places/format"
import { computePins, sortPins, type Pin, type SortKey } from "@/lib/places/pins"
import type { Anchor, Person, Place, Tag } from "@/lib/places/types"
import { DEFAULT_CAMERA, MapCanvas, type Camera } from "./map-canvas"
import { MapMenu } from "./map-menu"
import { OriginMarker } from "./origin-marker"
import { PlaceMarker } from "./place-marker"
import { ClusterMarker } from "./cluster-marker"
import { clusterPoints, COMPACT_PIN, compactPinWidth } from "@/lib/places/cluster"

type ShellProps = {
  places: Place[]
  tags: Tag[]
  anchors: Anchor[]
  people: Person[]
  userId: string
}

export function MapShell(props: ShellProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <Shell {...props} />
    </APIProvider>
  )
}

/** Controls floating on the map (colors follow the light/dark map theme). */
/**
 * Controls floating on the map: borderless paper tiles with a soft shadow,
 * paper on both map themes so they belong with the receipt, not the map.
 */
const onMap =
  "flex h-11 items-center justify-center rounded-[4px] bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.18)] hover:bg-paper-2"

const SIDE_PANEL_PX = 420 // panel width + margins, for centering the map's visible area

// Phones: pins that would overlap on screen are piled into one receipt stack.
// Each pin is measured by its own name (compactPinWidth), plus a few pixels of
// air; closer than that across AND down, they overlap. From this zoom on,
// there's room for every pin.
const CLUSTER_GAP = { x: 4, y: 2 }
const CLUSTER_MAX_ZOOM = 17
const PRIORITY: Record<Pin["state"]["status"], number> = { open: 3, closing: 2, closed: 1, unknown: 0 }

function Shell({ places, tags, anchors, people, userId }: ShellProps) {
  const map = useMap()
  const now = useNow()
  const geo = useGeolocation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [theme, setTheme] = useMapTheme()
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA)

  /** Switching re-creates the map, so keep the current view for the new one. */
  function toggleTheme() {
    const center = map?.getCenter()
    const zoom = map?.getZoom()
    if (center && zoom !== undefined) setCamera({ center: center.toJSON(), zoom })
    setTheme(theme === "dark" ? "light" : "dark")
  }
  // Web only: the receipt panel can be hidden to see the whole map (remembered).
  const [panelHidden, setPanelHidden] = usePersistentFlag("foodmap.panelHidden")
  const panelOpen = isDesktop && !panelHidden
  const [filters, setFilters] = useFilters()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [level, setLevel] = useState<SheetLevel>("peek")
  const [sortChoice, setSortChoice] = useState<SortKey | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [choosingOrigin, setChoosingOrigin] = useState(false)
  const [editingHours, setEditingHours] = useState(false)
  // adding a place by hand: placing the pin, then its hours
  const [placing, setPlacing] = useState<{ name: string } | null>(null)
  const [newPlace, setNewPlace] = useState<NewPlace | null>(null)
  // a short message over the map, e.g. when an "added" place was already there
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // ── where distances are measured from ──
  const anchor = typeof filters.from === "number" ? anchors.find((a) => a.id === filters.from) : undefined
  const origin: { kind: "here" | "anchor"; label: string; position: LatLng | null } = anchor
    ? { kind: "anchor", label: anchor.name, position: { lat: anchor.lat, lng: anchor.lng } }
    : { kind: "here", label: "Here", position: geo.position }
  const originLat = origin.position?.lat ?? null
  const originLng = origin.position?.lng ?? null

  // ── time ──
  const target = now === null ? null : resolveTarget(filters.time, now)
  const label = target && now !== null ? targetLabel(filters.time, target, now) : "Now"
  const targetMs = target?.getTime() ?? null

  const pins = useMemo(
    () =>
      targetMs === null
        ? []
        : computePins(
            places,
            targetMs,
            originLat !== null && originLng !== null ? { lat: originLat, lng: originLng } : null,
            { stay: filters.stay, status: filters.status, tags: filters.tags, price: filters.price },
          ),
    [places, targetMs, originLat, originLng, filters.stay, filters.status, filters.tags, filters.price],
  )

  const shown = pins.filter((p) => p.matches && (!filters.openOnly || p.fits))
  const visibleOnMap = pins.filter((p) => p.place.id === selectedId || shown.includes(p))
  const openCount = pins.filter((p) => p.matches && p.fits).length
  const matchCount = pins.filter((p) => p.matches).length
  const selected = pins.find((p) => p.place.id === selectedId)

  // ── clusters (phones) ──
  // Regrouped when the map comes to rest, not on every frame of a zoom.
  const [zoom, setZoom] = useState<number | null>(null)
  useEffect(() => {
    if (!map) return
    const listener = map.addListener("idle", () => setZoom(map.getZoom() ?? null))
    return () => listener.remove()
  }, [map])

  const pinById = new Map(visibleOnMap.map((p) => [p.place.id, p]))
  const projection =
    !isDesktop && zoom !== null && zoom < CLUSTER_MAX_ZOOM ? map?.getProjection() : undefined
  // null = no grouping: every pin on its own (web, close zoom, map not ready)
  const groups =
    projection && zoom !== null
      ? clusterPoints(
          // the open place stays a pin of its own, never part of a pile
          visibleOnMap
            .filter((p) => p.place.id !== selectedId)
            .flatMap((p) => {
              const world = projection.fromLatLngToPoint(p.place)
              return world
                ? [
                    {
                      id: p.place.id,
                      x: world.x * 2 ** zoom,
                      y: world.y * 2 ** zoom,
                      w: compactPinWidth(p.place.name),
                      h: COMPACT_PIN.h,
                      priority: PRIORITY[p.state.status],
                    },
                  ]
                : []
            }),
          CLUSTER_GAP,
        )
      : null

  function renderPin(pin: Pin) {
    return (
      <PlaceMarker
        key={pin.place.id}
        pin={pin}
        selected={pin.place.id === selectedId}
        compact={!isDesktop}
        onSelect={(id) => {
          if (placing) return // placing a pin by hand: the map is for moving
          setSelectedId(id)
          reveal()
        }}
      />
    )
  }

  /** Zooms in on a pile until its pins come apart. */
  function zoomInto(ids: string[]) {
    if (!map) return
    const bounds = new google.maps.LatLngBounds()
    for (const id of ids) {
      const pin = pinById.get(id)
      if (pin) bounds.extend(pin.place)
    }
    const before = map.getZoom() ?? 0
    map.fitBounds(bounds, {
      top: 90,
      left: 40,
      right: 40,
      bottom: Math.round(sheetHeightPx(level, window.innerHeight)) + 40,
    })
    google.maps.event.addListenerOnce(map, "idle", () => {
      // all in (nearly) one spot: fitting doesn't get closer, so just zoom in
      if ((map.getZoom() ?? 0) <= before) map.setZoom(before + 2)
    })
  }
  const filterCount = activeFilterCount(filters)

  // Default to distance when we know where you are; you can override it.
  const canSortByDistance = origin.position !== null
  const sort: SortKey =
    sortChoice === "nearest" && !canSortByDistance
      ? "latest"
      : (sortChoice ?? (canSortByDistance ? "nearest" : "latest"))
  const sorted = sortPins(shown, sort) // a few dozen items: cheap, no memo needed
  const nearestOpen = canSortByDistance
    ? sortPins(pins.filter((p) => p.matches && p.fits), "nearest")[0]
    : undefined

  // ── map focus ──
  /** Centers a point in the part of the map the receipt doesn't cover. */
  function focus(point: LatLng, sheetLevel: SheetLevel = level) {
    if (!map) return
    map.panTo(point)
    google.maps.event.addListenerOnce(map, "idle", () => {
      if (panelOpen) map.panBy(-SIDE_PANEL_PX / 2, 0)
      else if (!isDesktop) map.panBy(0, Math.round(sheetHeightPx(sheetLevel, window.innerHeight) / 2))
    })
  }

  /**
   * Makes sure the selected place can be seen. Selecting never changes how far
   * the sheet is pulled up, except lifting a collapsed one to "peek" (mobile),
   * or showing a hidden panel (web). Returns the level the sheet ends up at.
   */
  function reveal(): SheetLevel {
    if (isDesktop) {
      if (panelHidden) setPanelHidden(false)
      return level
    }
    const next = level === "collapsed" ? "peek" : level
    setLevel(next)
    return next
  }

  function select(pin: Pick<Pin, "place">) {
    setSelectedId(pin.place.id)
    focus(pin.place, reveal())
  }

  // Pan to the GPS fix after the user asked to locate.
  const panOnFix = useRef(false)
  useEffect(() => {
    if (panOnFix.current && geo.position && map) {
      panOnFix.current = false
      focus(geo.position)
    }
    // focus is recreated each render; only a new fix should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.position, map])

  function recenter() {
    if (origin.kind === "here") {
      panOnFix.current = true
      geo.locate()
    } else if (origin.position) {
      focus(origin.position)
    }
  }

  const listHeader = (
    <ReceiptHeader
      showTitle={isDesktop}
      target={target}
      label={label}
      time={filters.time}
      stay={filters.stay}
      onTimeChange={(time) => setFilters((f) => ({ ...f, time }))}
      openCount={openCount}
      matchCount={matchCount}
      nearest={nearestOpen}
      hasOrigin={canSortByDistance}
      onNearest={select}
      onSetOrigin={() => setChoosingOrigin(true)}
      filterCount={filterCount}
      onFilters={() => setFiltering(true)}
      onAdd={() => setAdding(true)}
    />
  )

  // One model for list and place: the header is the drag handle and never
  // scrolls; while a place is open it becomes that place's header (× to close).
  const header = selected ? (
    <PlaceHeader pin={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditing(true)} />
  ) : (
    listHeader
  )

  const collapsedBar = selected ? (
    <CollapsedBar
      title={selected.place.name}
      label={`Show ${selected.place.name}`}
      onExpand={() => setLevel("peek")}
    >
      <StatusText tone={pinStatus(selected).tone}>
        {pinLabel(selected.state)}
      </StatusText>
    </CollapsedBar>
  ) : (
    <CollapsedBar
      title="FOOD MAP"
      label={`Show the list (${openCount} of ${matchCount} open)`}
      onExpand={() => setLevel("peek")}
    >
      <span>
        <Mark>{openCount}</Mark> OPEN
      </span>
      <span className="font-normal text-ink-muted">/ {matchCount}</span>
    </CollapsedBar>
  )

  const body = selected ? (
    <PlaceDetail
      pin={selected}
      timeLabel={filters.time.kind === "now" ? null : label}
      originLabel={origin.label}
      people={people}
      userId={userId}
      onEditHours={() => setEditingHours(true)}
    />
  ) : (
    <>
      {/* mobile: the title scrolls with the list instead of taking sheet height */}
      {!isDesktop && (
        <ReceiptTitle target={target} time={filters.time} stay={filters.stay} className="pb-2.5 pt-1" />
      )}
      <PlaceList
        pins={sorted}
        sort={sort}
        onSortChange={setSortChoice}
        canSortByDistance={canSortByDistance}
        totalPlaces={places.filter((p) => p.kind === "food").length}
        openCount={openCount}
        timeLabel={label}
        onSelect={select}
        onAdd={() => setAdding(true)}
        onOpenFilters={() => setFiltering(true)}
      />
    </>
  )

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-map">
      <MapCanvas
        theme={theme}
        camera={camera}
        onMapClick={() => {
          setSelectedId(null)
          // pull a raised sheet back down, but leave a collapsed one collapsed
          if (!isDesktop) setLevel((l) => (l === "half" || l === "full" ? "peek" : l))
        }}
      >
        {origin.position && (
          <OriginMarker position={origin.position} kind={origin.kind} label={origin.label} icon={anchor?.icon} />
        )}
        {groups
          ? groups.map((g) => {
              const seed = pinById.get(g.seed)
              if (!seed) return null
              if (g.members.length === 1) return renderPin(seed)
              const open = g.members.filter((id) => {
                const status = pinById.get(id)?.state.status
                return status === "open" || status === "closing"
              }).length
              return (
                <ClusterMarker
                  key={`cluster-${g.seed}`}
                  position={seed.place}
                  total={g.members.length}
                  open={open}
                  onClick={() => {
                    if (!placing) zoomInto(g.members)
                  }}
                />
              )
            })
          : visibleOnMap.map(renderPin)}
        {/* left out of the piles above, so it's always there on its own */}
        {groups && selected && renderPin(selected)}
      </MapCanvas>

      {/* Top: from where · locate · menu (right of the panel on web) */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] flex items-start justify-between gap-2 lg:right-5 lg:top-5",
          panelOpen ? "lg:left-[27rem]" : "lg:left-5",
        )}
      >
        <div className="pointer-events-auto flex min-w-0 gap-2">
          {isDesktop && panelHidden && (
            <PanelTab openCount={openCount} onExpand={() => setPanelHidden(false)} />
          )}
          <button
            type="button"
            onClick={() => setChoosingOrigin(true)}
            className={cn(onMap, "min-w-0 gap-2 px-3 text-xs font-bold uppercase tracking-[0.04em]")}
          >
            {/* lime dot = your live location is being used */}
            {origin.kind === "here" && origin.position && (
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-lime shadow-[0_0_0_1.5px_var(--ink)]" />
            )}
            <span className="shrink-0 text-[9px] tracking-[0.14em] text-ink-muted">FROM</span>
            <span className="truncate">
              {origin.label}
              {origin.kind === "here" && !origin.position && " (OFF)"}
            </span>
            <ChevronDown className="size-4 shrink-0" />
          </button>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={recenter}
            aria-label={origin.kind === "here" ? "Show my location" : `Show ${origin.label}`}
            className={cn(onMap, "w-11")}
          >
            <LocateFixed className={cn("size-5", geo.status === "locating" && "animate-pulse")} />
          </button>
          <MapMenu theme={theme} onToggleTheme={toggleTheme} onNotice={setNotice} className={onMap} />
        </div>
      </div>

      {/* Notice, under the top controls. The live region stays mounted so
          screen readers announce each new message. */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute inset-x-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] flex justify-center lg:right-5 lg:top-20",
          panelOpen ? "lg:left-[27rem]" : "lg:left-5",
        )}
      >
        {notice && (
          <p
            className={cn(
              onMap,
              "h-auto max-w-full px-3 py-2.5 text-xs font-bold uppercase tracking-[0.04em] hover:bg-paper",
            )}
          >
            <span className="truncate">{notice}</span>
          </p>
        )}
      </div>

      {placing ? (
        // the receipt steps aside while you place a pin by hand
        <PinPicker
          initialName={placing.name}
          position={geo.position}
          onLocate={() => geo.locate()}
          onCancel={() => setPlacing(null)}
          onNext={(name, at) => setNewPlace({ name, ...at })}
        />
      ) : isDesktop ? (
        <SidePanel
          header={header}
          collapsed={panelHidden}
          onCollapse={() => setPanelHidden(true)}
          scrollKey={selectedId ?? "list"}
        >
          {body}
        </SidePanel>
      ) : (
        <PlaceSheet
          level={level}
          onLevelChange={setLevel}
          scrollKey={selectedId ?? "list"}
          header={level === "collapsed" ? collapsedBar : header}
        >
          {body}
        </PlaceSheet>
      )}

      <OriginDrawer
        open={choosingOrigin}
        onOpenChange={setChoosingOrigin}
        from={anchor ? anchor.id : "here"}
        anchors={anchors}
        geo={geo}
        onSelect={(from) => setFilters((f) => ({ ...f, from }))}
      />

      <FiltersDrawer
        open={filtering}
        onOpenChange={setFiltering}
        filters={filters}
        onChange={setFilters}
        tags={tags}
      />

      <AddPlaceDrawer
        open={adding}
        onOpenChange={setAdding}
        onAddManually={(name) => {
          setAdding(false)
          setSelectedId(null)
          setPlacing({ name })
          // close enough to put the pin on the right side of the road
          if ((map?.getZoom() ?? 0) < 16) map?.setZoom(16)
        }}
        onAdded={(p) => {
          // Same Google place = same place: nothing new is saved, we show the
          // one you have. (Another branch is another Google place, so it adds.)
          if (p.existed) {
            const name = places.find((x) => x.id === p.placeId)?.name
            setNotice(name ? `Already on your list: ${name}` : "Already on your list")
          }
          if ((map?.getZoom() ?? 0) < 15) map?.setZoom(15)
          setSelectedId(p.placeId)
          focus(p, reveal())
        }}
      />

      <EditPlaceDrawer
        place={selected?.place}
        allTags={tags}
        userId={userId}
        open={editing}
        onOpenChange={setEditing}
        onDeleted={() => setSelectedId(null)}
      />

      <HoursDrawer place={selected?.place} open={editingHours} onOpenChange={setEditingHours} />

      <NewPlaceHoursDrawer
        place={newPlace}
        // closing without saving goes back to the pin, which is still where you left it
        onOpenChange={(open) => {
          if (!open) setNewPlace(null)
        }}
        onCreated={(created) => {
          setNotice(`Added ${newPlace?.name ?? "the place"}`)
          setNewPlace(null)
          setPlacing(null)
          setSelectedId(created.placeId)
          focus(created, reveal())
        }}
      />
    </main>
  )
}
