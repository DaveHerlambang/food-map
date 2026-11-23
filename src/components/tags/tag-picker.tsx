"use client"

import { cn } from "cn"
import type { Tag } from "@/lib/places/types"
import { groupTags } from "@/lib/tag-categories"

/** "#STREET-FOOD": how a tag is written everywhere. */
export const tagLabel = (name: string) => `#${name.replace(/\s+/g, "")}`

/**
 * Tags as toggle chips, grouped under their category (TYPE, CUISINE, AMBIENT,
 * OTHER). Shared by the edit form and the filters.
 */
export function TagPicker({
  tags,
  isSelected,
  onToggle,
}: {
  tags: Tag[]
  isSelected: (id: number) => boolean
  onToggle: (id: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {groupTags(tags).map((group) => (
        <div key={group.category} className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold tracking-[0.14em] text-ink-muted">{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected(t.id)}
                onClick={() => onToggle(t.id)}
                className={cn(
                  "h-9 rounded-sm border-[1.5px] border-ink px-3 text-xs font-bold uppercase transition-colors",
                  isSelected(t.id) ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-paper-2",
                )}
              >
                {tagLabel(t.name)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
