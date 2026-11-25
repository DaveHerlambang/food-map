"use client"

import { LoaderCircle } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { addManualPlace, followGoogleHours, setPlaceHours } from "@/lib/actions/places"
import type { LatLng } from "@/lib/geo"
import type { Place } from "@/lib/places/types"
import { HoursEditor } from "./hours-editor"

const SOURCE_NOTE: Record<Place["hoursSource"], string> = {
  google: "From Google. Saving here makes them yours: Google's refreshes won't change them.",
  manual: "Set by you. Google's refreshes never change them.",
  inherit: "Following the mall. Saving here gives it hours of its own.",
  unknown: "Not known yet.",
}

/** Edit the hours of a place that is already on the map. */
export function HoursDrawer({
  place,
  open,
  onOpenChange,
}: {
  place: Place | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {/* content unmounts when closed, so the form starts from the saved hours */}
        {place && (
          <>
            <DrawerHeader>
              <DrawerTitle className="truncate">Hours · {place.name}</DrawerTitle>
              <DrawerDescription className="text-[12px] text-ink-muted">{SOURCE_NOTE[place.hoursSource]}</DrawerDescription>
            </DrawerHeader>
            <HoursEditor
              initial={place.hours}
              submitLabel="Save hours"
              onSubmit={async (intervals) => {
                const result = await setPlaceHours(place.id, intervals)
                if (!result.ok) return result.error
                onOpenChange(false)
                return null
              }}
              secondary={
                place.googlePlaceId && place.hoursSource === "manual" ? (
                  <FollowGoogle placeId={place.id} onDone={() => onOpenChange(false)} />
                ) : undefined
              }
            />
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function FollowGoogle({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const [busy, startBusy] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          startBusy(async () => {
            const result = await followGoogleHours(placeId)
            if (!result.ok) return setError(result.error)
            onDone()
          })
        }
        className="h-11 text-xs"
      >
        {busy && <LoaderCircle className="animate-spin" />} Use Google&apos;s hours again
      </Button>
      {error && (
        <p role="alert" className="text-[13px] font-bold text-barbados">
          {error}
        </p>
      )}
    </>
  )
}

export type NewPlace = { name: string } & LatLng

/** Last step of adding a place by hand: its hours, or skip. */
export function NewPlaceHoursDrawer({
  place,
  onOpenChange,
  onCreated,
}: {
  place: NewPlace | null
  onOpenChange: (open: boolean) => void
  onCreated: (created: { placeId: string } & LatLng) => void
}) {
  const [skipping, startSkipping] = useTransition()
  const [skipError, setSkipError] = useState<string | null>(null)

  async function create(hours: Parameters<typeof addManualPlace>[0]["hours"]) {
    if (!place) return "Nothing to save."
    const result = await addManualPlace({ ...place, hours })
    if (!result.ok) return result.error
    onCreated(result)
    return null
  }

  return (
    <Drawer open={place !== null} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {place && (
          <>
            <DrawerHeader>
              <DrawerTitle className="truncate">Hours · {place.name}</DrawerTitle>
              <DrawerDescription className="text-[12px] text-ink-muted">
                Set them now, or skip and add them later from the place.
              </DrawerDescription>
            </DrawerHeader>
            <HoursEditor
              initial={null}
              submitLabel="Save place"
              onSubmit={create}
              secondary={
                <>
                  <Button
                    variant="outline"
                    disabled={skipping}
                    onClick={() =>
                      startSkipping(async () => {
                        setSkipError(await create(null))
                      })
                    }
                    className="h-11 text-xs"
                  >
                    {skipping && <LoaderCircle className="animate-spin" />} Skip, hours unknown
                  </Button>
                  {skipError && (
                    <p role="alert" className="text-[13px] font-bold text-barbados">
                      {skipError}
                    </p>
                  )}
                </>
              }
            />
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
