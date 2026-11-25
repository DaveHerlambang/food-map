"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Plus } from "lucide-react"
import { Rule } from "@/components/receipt/receipt"
import { PlaceSearch } from "@/components/search/place-search"
import { addPlaceFromGoogle, type AddPlaceResult } from "@/lib/actions/places"

type Added = Extract<AddPlaceResult, { ok: true }>

/** Search Google → pick a result → it's pinned. Must be rendered inside <APIProvider>. */
export function AddPlaceDrawer({
  open,
  onOpenChange,
  onAdded,
  onAddManually,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (place: Added) => void
  /** not on Google (or in the wrong spot): place it by hand, named after the search */
  onAddManually: (name: string) => void
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
        {/* flex-1 so a long result list scrolls inside the drawer instead of being cut off */}
        <div className="flex min-h-[55dvh] flex-1 flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
            emptyText="NO MATCH ON GOOGLE."
            footer={(query) => (
              <button
                type="button"
                onClick={() => onAddManually(query.trim())}
                className="flex h-11 shrink-0 items-center justify-between gap-2 rounded-sm border-[1.5px] border-dashed border-ink px-3 text-left text-xs font-bold uppercase hover:bg-paper-2"
              >
                <span>
                  Not on Google? <span className="underline underline-offset-2">Add it yourself</span>
                </span>
                <Plus className="size-4 shrink-0" />
              </button>
            )}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
