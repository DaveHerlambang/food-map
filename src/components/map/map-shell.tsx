"use client"

import { APIProvider, useMap } from "@vis.gl/react-google-maps"
import { ChevronDown, LocateFixed, LogOut, Moon, Sun } from "lucide-react"
import { cn } from "cn"
import { useEffect, useMemo, useRef, useState } from "react"
import { AddPlaceDrawer } from "@/components/add-place/add-place-drawer"
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
import { logout } from "@/app/login/actions"
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
import { OriginMarker } from "./origin-marker"
import { PlaceMarker } from "./place-marker"

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
const onMap =
  "flex h-11 items-center justify-center rounded-sm border-[1.5px] border-chrome-fg bg-chrome text-chrome-fg shadow-[0_3px_12px_rgba(0,0,0,0.35)] hover:bg-chrome-hover"

const SIDE_PANEL_PX = 420 // panel width + margins, for centering the map's visible area

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
          <OriginMarker position={origin.position} kind={origin.kind} label={origin.label} />
        )}
        {visibleOnMap.map((pin) => (
          <PlaceMarker
            key={pin.place.id}
            pin={pin}
            selected={pin.place.id === selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              reveal()
            }}
          />
        ))}
      </MapCanvas>

      {/* Top: from where · locate · sign out (right of the panel on web) */}
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
            <span className="truncate">
              FROM: {origin.label}
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
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light map" : "Switch to dark map"}
            title={theme === "dark" ? "Light map" : "Dark map"}
            className={cn(onMap, "w-11")}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          {/* TEMPORARY sign-out until the real menu exists */}
          <form action={logout}>
            <button type="submit" aria-label="Sign out" className={cn(onMap, "w-11")}>
              <LogOut className="size-5" />
            </button>
          </form>
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
              "h-auto max-w-full px-3 py-2.5 text-xs font-bold uppercase tracking-[0.04em] hover:bg-chrome",
            )}
          >
            <span className="truncate">{notice}</span>
          </p>
        )}
      </div>

      {isDesktop ? (
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
    </main>
  )
}
