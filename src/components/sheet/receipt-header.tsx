"use client"

import { Plus, SlidersHorizontal } from "lucide-react"
import { TimeChips } from "@/components/filters/time-chips"
import { Leader, Mark, Rule } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import type { TimeChoice } from "@/lib/filters"
import { receiptDate, receiptKm } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"

/**
 * Top of the receipt: store name, date line, time buttons, TOTAL OPEN and the
 * three actions. Shared by the mobile sheet (its peek height) and the web panel.
 */
export function ReceiptHeader({
  target,
  label,
  time,
  stay,
  onTimeChange,
  openCount,
  matchCount,
  nearest,
  hasOrigin,
  onNearest,
  onSetOrigin,
  filterCount,
  onFilters,
  onAdd,
}: {
  target: Date | null
  label: string
  time: TimeChoice
  stay: number
  onTimeChange: (time: TimeChoice) => void
  openCount: number
  matchCount: number
  nearest: Pin | undefined
  hasOrigin: boolean
  onNearest: (pin: Pin) => void
  onSetOrigin: () => void
  filterCount: number
  onFilters: () => void
  onAdd: () => void
}) {
  const dateLine = target ? receiptDate(target) : "…"

  return (
    <div className="flex flex-col gap-2.5 pb-3">
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-[0.14em]">FOOD MAP</p>
        <p className="text-[11px] text-ink-muted">
          {time.kind === "now" ? "NOW · " : ""}
          {dateLine} · STAY {stay === 0 ? "ANY" : `${stay} MIN`}
        </p>
      </div>
      <Rule />
      <TimeChips value={time} label={label} onChange={onTimeChange} />

      <Leader
        className="text-base font-bold"
        left="TOTAL OPEN"
        right={
          <span>
            <Mark className="text-xl">{openCount}</Mark>
            <span className="ml-1 text-xs font-normal text-ink-muted">/ {matchCount}</span>
          </span>
        }
      />

      <div className="flex gap-1.5">
        {nearest ? (
          <Button onClick={() => onNearest(nearest)} className="h-12 min-w-0 flex-1 justify-between px-3 text-xs">
            <span className="truncate">NEAREST: {nearest.place.name}</span>
            {nearest.trip && <span className="shrink-0 pl-2">{receiptKm(nearest.trip.km)}</span>}
          </Button>
        ) : hasOrigin ? (
          <Button disabled className="h-12 min-w-0 flex-1 text-xs">
            NOTHING OPEN · TRY ANOTHER TIME
          </Button>
        ) : (
          <Button onClick={onSetOrigin} className="h-12 min-w-0 flex-1 text-xs">
            SET WHERE YOU START
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onFilters}
          aria-label={`Filters${filterCount ? ` (${filterCount} active)` : ""}`}
          className="relative size-12 [&_svg:not([class*='size-'])]:size-5"
        >
          <SlidersHorizontal />
          {filterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-sm border-[1.5px] border-ink bg-lime text-[11px] text-ink">
              {filterCount}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onAdd}
          aria-label="Add a place"
          className="size-12 [&_svg:not([class*='size-'])]:size-5"
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
