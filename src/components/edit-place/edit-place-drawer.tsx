"use client"

import { LoaderCircle, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import { useState, useTransition } from "react"
import { Rule, SectionLabel } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { createTag, deletePlace, updatePlace } from "@/lib/actions/places"
import type { Place, PlaceStatus, Tag } from "@/lib/places/types"

export function EditPlaceDrawer({
  place,
  allTags,
  userId,
  open,
  onOpenChange,
  onDeleted,
}: {
  place: Place | undefined
  allTags: Tag[]
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {/* Popup content unmounts when closed, so the form starts fresh each time. */}
        {place && (
          <EditForm
            place={place}
            allTags={allTags}
            userId={userId}
            onDone={() => onOpenChange(false)}
            onDeleted={onDeleted}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

const toggle = "rounded-sm border-[1.5px] border-ink text-xs font-bold uppercase transition-colors"
const on = "bg-ink text-paper"
const off = "bg-transparent text-ink hover:bg-paper-2"

function EditForm({
  place,
  allTags,
  userId,
  onDone,
  onDeleted,
}: {
  place: Place
  allTags: Tag[]
  userId: string
  onDone: () => void
  onDeleted: () => void
}) {
  const [status, setStatus] = useState<PlaceStatus>(place.status)
  const [notes, setNotes] = useState(place.notes ?? "")
  const [tagIds, setTagIds] = useState(() => new Set(place.tags.map((t) => t.id)))
  const [rating, setRating] = useState<number | null>(
    place.ratings.find((r) => r.userId === userId)?.rating ?? null,
  )
  const [extraTags, setExtraTags] = useState<Tag[]>([]) // created in this session
  const [newTag, setNewTag] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [tagging, startTagging] = useTransition()

  const tags = [...allTags, ...extraTags.filter((t) => !allTags.some((a) => a.id === t.id))]

  function toggleTag(id: number) {
    setTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addTag() {
    const name = newTag.trim()
    if (!name) return
    startTagging(async () => {
      const result = await createTag(name)
      if (!result.ok) return setError(result.error)
      setExtraTags((prev) => [...prev, result.tag])
      setTagIds((prev) => new Set(prev).add(result.tag.id))
      setNewTag("")
      setError(null)
    })
  }

  function save() {
    startSaving(async () => {
      const result = await updatePlace(place.id, {
        status,
        notes,
        tagIds: [...tagIds],
        // kept even if switched back to wishlist, so a mis-tap doesn't lose it
        rating,
      })
      if (!result.ok) return setError(result.error)
      onDone()
    })
  }

  function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    startSaving(async () => {
      const result = await deletePlace(place.id)
      if (!result.ok) return setError(result.error)
      onDone()
      onDeleted()
    })
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle className="truncate">Edit · {place.name}</DrawerTitle>
      </DrawerHeader>

      <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto p-4">
        <Rule />
        <section className="flex flex-col gap-2">
          <SectionLabel>Status</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {(["wishlist", "visited"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(toggle, "h-11", status === s ? on : off)}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Your rating — only meaningful once you've been there */}
        {status === "visited" && (
          <section className="flex flex-col gap-2">
            <SectionLabel>Your rating</SectionLabel>
            <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  // tap the current rating again to clear it
                  onClick={() => setRating(rating === n ? null : n)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-sm text-2xl leading-none hover:bg-paper-2",
                    rating !== null && n <= rating ? "text-ink" : "text-rule",
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tagIds.has(t.id)}
                onClick={() => toggleTag(t.id)}
                className={cn(toggle, "h-9 px-3", tagIds.has(t.id) ? on : off)}
              >
                #{t.name.replace(/\s+/g, "")}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="New tag"
              aria-label="New tag"
              maxLength={30}
              className="h-10 text-base"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={tagging || !newTag.trim()}
              className="h-10 px-3 text-xs"
            >
              {tagging ? <LoaderCircle className="animate-spin" /> : <Plus />} Add
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Note</SectionLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Note"
            placeholder="e.g. heard the duck here is great"
            className="w-full rounded-sm border-[1.5px] border-ink bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-ink-muted focus-visible:ring-3 focus-visible:ring-ink/30"
          />
        </section>

        {error && (
          <p role="alert" className="text-[13px] font-bold text-barbados">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Rule className="mb-3" />
        <Button onClick={save} disabled={saving} className="h-12 text-sm">
          {saving && <LoaderCircle className="animate-spin" />} Save
        </Button>
        <Button
          variant="destructive"
          onClick={remove}
          onBlur={() => setConfirmDelete(false)}
          disabled={saving}
          className="h-11 text-xs"
        >
          <Trash2 /> {confirmDelete ? "Tap again to void this place" : "Delete place"}
        </Button>
      </div>
    </>
  )
}
