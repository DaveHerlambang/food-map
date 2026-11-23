"use client"

import { ChevronUp, Plus, SlidersHorizontal } from "lucide-react"
import { cn } from "cn"
import { TimeChips } from "@/components/filters/time-chips"
import { Leader, Mark, Rule } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import type { TimeChoice } from "@/lib/filters"
import { receiptDate, receiptKm } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"

/** Store name + the date/stay line. Printed at the top of the receipt. */
export function ReceiptTitle({
  target,
  time,
  stay,
  className,
}: {
  target: Date | null
  time: TimeChoice
  stay: number
  className?: string
}) {
  const dateLine = target ? receiptDate(target) : "…"
  return (
    <div className={cn("text-center", className)}>
      <p className="text-[15px] font-bold tracking-[0.14em]">FOOD MAP</p>
      <p className="text-[11px] text-ink-muted">
        {time.kind === "now" ? "NOW · " : ""}
        {dateLine} · STAY {stay === 0 ? "ANY" : `${stay} MIN`}
      </p>
    </div>
  )
}

/**
 * Mobile, sheet swiped all the way down: one line, so the map is almost fully
 * visible. Shows the list summary, or the selected place and its closing time.
 * Tap to bring the receipt back.
 */
export function CollapsedBar({
  title,
  label,
  onExpand,
  children,
}: {
  title: string
  /** accessible name, e.g. "Show the list (3 of 6 open)" */
  label: string
  onExpand: () => void
  /** right-hand side: the count or the place's status */
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={label}
      className="flex w-full items-center justify-between gap-3 rounded-sm px-1 pb-2 pt-1 text-left"
    >
      <span className="min-w-0 truncate text-[13px] font-bold uppercase tracking-[0.1em]">{title}</span>
      <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold">
        {children}
        <ChevronUp aria-hidden="true" className="size-5 text-ink-muted" />
      </span>
    </button>
  )
}

/**
 * Time buttons, TOTAL OPEN and the three actions. On web it also carries the
 * title (the panel is tall); on mobile the title moves into the scrolling list
 * so the sheet's resting height stays small and the map stays big.
 */
export function ReceiptHeader({
  showTitle,
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
  showTitle: boolean
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
  return (
    <div className="flex flex-col gap-2.5 pb-3">
      {showTitle && (
        <>
          <ReceiptTitle target={target} time={time} stay={stay} />
          <Rule />
        </>
      )}
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
