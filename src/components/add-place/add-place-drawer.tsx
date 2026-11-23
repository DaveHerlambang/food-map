"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Rule } from "@/components/receipt/receipt"
import { PlaceSearch } from "@/components/search/place-search"
import { addPlaceFromGoogle, type AddPlaceResult } from "@/lib/actions/places"

type Added = Extract<AddPlaceResult, { ok: true }>

/** Search Google → pick a result → it's pinned. Must be rendered inside <APIProvider>. */
export function AddPlaceDrawer({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (place: Added) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add a place</DrawerTitle>
          <DrawerDescription className="text-[12px] text-ink-muted">
            Search Google, tap a result, and it&apos;s printed on your map.
          </DrawerDescription>
        </DrawerHeader>

        {/* content unmounts when closed, so the search starts fresh each time */}
        <div className="flex min-h-[55dvh] flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Rule />
          <PlaceSearch
            autoFocus
            placeholder="e.g. Bebek Sinjay Kenjeran"
            onPick={async (s, token) => {
              const result = await addPlaceFromGoogle(s.placeId, token)
              if (!result.ok) return result.error
              onOpenChange(false)
              onAdded(result)
              return null
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
