"use client"

import { cn } from "cn"
import { Rule, SectionLabel } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { DEFAULT_FILTERS, STAY_OPTIONS, type Filters, type StatusFilter } from "@/lib/filters"
import type { Tag } from "@/lib/places/types"

const toggle = "rounded-sm border-[1.5px] border-ink text-xs font-bold uppercase transition-colors"
const on = "bg-ink text-paper"
const off = "bg-transparent text-ink hover:bg-paper-2"

export function FiltersDrawer({
  open,
  onOpenChange,
  filters,
  onChange,
  tags,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: Filters
  onChange: (next: Filters) => void
  tags: Tag[]
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  function toggleTag(id: number) {
    set({
      tags: filters.tags.includes(id) ? filters.tags.filter((t) => t !== id) : [...filters.tags, id],
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
        </DrawerHeader>

        <div className="flex max-h-[70dvh] flex-col gap-5 overflow-y-auto p-4">
          <Rule />
          <Field label="Show" hint="Hide places that are closed, or close too soon, at the chosen time.">
            <Segmented
              options={[
                { value: false, label: "All" },
                { value: true, label: "Open only" },
              ]}
              value={filters.openOnly}
              onChange={(openOnly) => set({ openOnly })}
            />
          </Field>

          <Field label="Time to eat" hint="A place only counts as open if it stays open this long after you arrive.">
            <Segmented
              options={STAY_OPTIONS.map((m) => ({ value: m, label: m === 0 ? "Any" : `${m}m` }))}
              value={filters.stay}
              onChange={(stay) => set({ stay })}
            />
          </Field>

          <Field label="Status">
            <Segmented<StatusFilter>
              options={[
                { value: "all", label: "All" },
                { value: "wishlist", label: "Wishlist" },
                { value: "visited", label: "Visited" },
              ]}
              value={filters.status}
              onChange={(status) => set({ status })}
            />
          </Field>

          {tags.length > 0 && (
            <Field label="Tags" hint="Places with any of the selected tags.">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={filters.tags.includes(t.id)}
                    onClick={() => toggleTag(t.id)}
                    className={cn(toggle, "h-9 px-3", filters.tags.includes(t.id) ? on : off)}
                  >
                    #{t.name.replace(/\s+/g, "")}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Rule />
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              className="h-12 flex-1 text-xs"
              onClick={() => onChange({ ...DEFAULT_FILTERS, time: filters.time, from: filters.from })}
            >
              Reset
            </Button>
            <Button className="h-12 flex-1 text-xs" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <SectionLabel>{label}</SectionLabel>
        {hint && <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(toggle, "h-11 px-1", value === o.value ? on : off)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
