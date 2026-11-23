"use client"

import { ArrowLeft, LoaderCircle, LocateFixed, MapPin, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import { useState, useTransition } from "react"
import { Rule, SectionLabel } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { PlaceSearch } from "@/components/search/place-search"
import type { Geo } from "@/hooks/use-geolocation"
import { createAnchor, deleteAnchor, resolvePlaceLocation } from "@/lib/actions/anchors"
import type { LatLng } from "@/lib/geo"
import type { Anchor } from "@/lib/places/types"

type From = "here" | number

/** "Distances from…": your GPS location, or a saved place like "Her office". */
export function OriginDrawer({
  open,
  onOpenChange,
  from,
  anchors,
  geo,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  from: From
  anchors: Anchor[]
  geo: Geo
  onSelect: (from: From) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {/* content unmounts when closed, so it reopens on the list */}
        <OriginContent
          from={from}
          anchors={anchors}
          geo={geo}
          onSelect={(f) => {
            onSelect(f)
            onOpenChange(false)
          }}
        />
      </DrawerContent>
    </Drawer>
  )
}

function OriginContent({
  from,
  anchors,
  geo,
  onSelect,
}: {
  from: From
  anchors: Anchor[]
  geo: Geo
  onSelect: (from: From) => void
}) {
  const [view, setView] = useState<"list" | "add">("list")
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()

  if (view === "add") {
    return <AddAnchor geo={geo} onBack={() => setView("list")} onSaved={(anchor) => onSelect(anchor.id)} />
  }

  function remove(id: number) {
    if (confirmId !== id) return setConfirmId(id)
    startBusy(async () => {
      const result = await deleteAnchor(id)
      if (!result.ok) return setError(result.error)
      setConfirmId(null)
      if (from === id) onSelect("here")
    })
  }

  const hereHint =
    geo.status === "denied"
      ? "Location is blocked. iPhone: Settings → Apps → Safari → Location. Android: tap the icon left of the address bar → Permissions."
      : geo.status === "unavailable"
        ? "Couldn't get your location. Try again with GPS on."
        : geo.status === "locating"
          ? "Finding you…"
          : geo.status === "ok"
            ? `Located (±${Math.round(geo.accuracy ?? 0)} m)`
            : "Uses your phone's GPS"

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Distances from</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Rule className="mb-1" />
        <Row
          selected={from === "here"}
          icon={<LocateFixed className="size-5" />}
          title="Here"
          subtitle={hereHint}
          onClick={() => {
            geo.locate()
            onSelect("here")
          }}
        />

        {anchors.map((a) => (
          <Row
            key={a.id}
            selected={from === a.id}
            icon={<MapPin className="size-5" />}
            title={a.name}
            onClick={() => onSelect(a.id)}
            action={
              <Button
                variant={confirmId === a.id ? "destructive" : "ghost"}
                aria-label={`Delete ${a.name}`}
                disabled={busy}
                onClick={() => remove(a.id)}
                onBlur={() => setConfirmId(null)}
                className={cn("h-10 text-xs", confirmId === a.id ? "px-3" : "w-10")}
              >
                <Trash2 />
                {confirmId === a.id && "Delete?"}
              </Button>
            }
          />
        ))}

        {error && (
          <p role="alert" className="py-2 text-[13px] font-bold text-barbados">
            {error}
          </p>
        )}

        <Button variant="outline" className="mt-3 h-12 text-xs" onClick={() => setView("add")}>
          <Plus /> Save a location
        </Button>
      </div>
    </>
  )
}

function Row({
  selected,
  icon,
  title,
  subtitle,
  onClick,
  action,
}: {
  selected: boolean
  icon: React.ReactNode
  title: string
  subtitle?: string
  onClick: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1 border-b-[1.5px] border-dashed border-rule">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className="flex min-h-14 flex-1 items-center gap-3 rounded-sm px-1 py-2 text-left hover:bg-paper-2"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink text-[11px] font-bold",
            selected && "bg-ink text-paper",
          )}
        >
          {selected ? "✓" : ""}
        </span>
        <span className="text-ink-muted">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold uppercase">{title}</span>
          {subtitle && <span className="block text-[12px] text-ink-muted">{subtitle}</span>}
        </span>
      </button>
      {action}
    </div>
  )
}

function AddAnchor({
  geo,
  onBack,
  onSaved,
}: {
  geo: Geo
  onBack: () => void
  onSaved: (anchor: Anchor) => void
}) {
  const [name, setName] = useState("")
  const [spot, setSpot] = useState<(LatLng & { label: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  function pickCurrentLocation() {
    if (geo.position) {
      setSpot({ ...geo.position, label: "Your current location" })
      setError(null)
    } else {
      geo.locate()
      setError(
        geo.status === "denied"
          ? "Location is blocked — search for the place instead."
          : "Finding you… tap again in a moment.",
      )
    }
  }

  function save() {
    if (!spot) return setError("Pick a location first.")
    startSaving(async () => {
      const result = await createAnchor({ name, lat: spot.lat, lng: spot.lng })
      if (!result.ok) return setError(result.error)
      onSaved(result.anchor)
    })
  }

  return (
    <>
      <DrawerHeader className="relative">
        <Button
          variant="ghost"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-2 top-2.5 size-10"
        >
          <ArrowLeft />
        </Button>
        <DrawerTitle>Save a location</DrawerTitle>
      </DrawerHeader>
      <div className="flex min-h-[60dvh] flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Rule />
        <label className="flex flex-col gap-1.5">
          <SectionLabel>Name</SectionLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Her office"
            maxLength={40}
            className="h-12 text-base"
          />
        </label>

        <SectionLabel className="pt-1">Location</SectionLabel>
        {spot ? (
          <div className="flex items-center gap-3 rounded-sm border-[1.5px] border-ink px-3 py-2">
            <MapPin className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold uppercase">{spot.label}</span>
            <Button variant="ghost" onClick={() => setSpot(null)} className="h-9 px-2 text-xs">
              Change
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" className="h-11 text-xs" onClick={pickCurrentLocation}>
              <LocateFixed /> Use my current location
            </Button>
            <p className="text-center text-[11px] tracking-[0.14em] text-ink-muted">— OR SEARCH —</p>
            <PlaceSearch
              placeholder="Search an address or building"
              onPick={async (s, token) => {
                const result = await resolvePlaceLocation(s.placeId, token)
                if (!result.ok) return result.error
                setSpot({ lat: result.lat, lng: result.lng, label: s.main || result.address || "Selected place" })
                setError(null)
                return null
              }}
            />
          </>
        )}

        {error && (
          <p role="alert" className="text-[13px] font-bold text-barbados">
            {error}
          </p>
        )}

        <Button className="mt-auto h-12 text-sm" onClick={save} disabled={saving || !spot || !name.trim()}>
          {saving && <LoaderCircle className="animate-spin" />} Save
        </Button>
      </div>
    </>
  )
}
