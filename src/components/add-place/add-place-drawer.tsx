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
import { Button } from "@/components/ui/button"
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
            emptyText="NO MATCH ON GOOGLE."
            footer={(query) => (
              <div className="flex flex-col gap-2">
                <Rule />
                <p className="text-[12px] text-ink-muted">Not on Google, or in the wrong spot? Drop the pin yourself.</p>
                <Button variant="outline" onClick={() => onAddManually(query.trim())} className="h-11 text-xs">
                  <Plus /> Add it yourself
                </Button>
              </div>
            )}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
