"use client"

import { cn } from "cn"
import { Leader, Mark, Rule, StatusText } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { pinStatus, receiptKm } from "@/lib/places/format"
import { SORT_LABELS, type Pin, type SortKey } from "@/lib/places/pins"

/** The line items: every place as a numbered receipt row. */
export function PlaceList({
  pins,
  sort,
  onSortChange,
  canSortByDistance,
  totalPlaces,
  openCount,
  timeLabel,
  onSelect,
  onAdd,
  onOpenFilters,
}: {
  pins: Pin[]
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  canSortByDistance: boolean
  /** all places, before filters — to tell "no places yet" from "nothing matches" */
  totalPlaces: number
  openCount: number
  timeLabel: string
  onSelect: (pin: Pin) => void
  onAdd: () => void
  onOpenFilters: () => void
}) {
  if (totalPlaces === 0) {
    return (
      <Empty title="NO ITEMS YET" body="Add the spots from your notes and they'll be printed here.">
        <Button onClick={onAdd} className="h-11 px-4">
          Add your first place
        </Button>
      </Empty>
    )
  }

  const sorts: SortKey[] = canSortByDistance ? ["nearest", "latest", "name"] : ["latest", "name"]

  return (
    <div className="flex flex-col gap-1">
      <Rule />
      <div className="flex items-center gap-1 py-1.5" role="radiogroup" aria-label="Sort">
        <span className="mr-1 text-[11px] font-bold tracking-[0.14em] text-ink-muted">SORT</span>
        {sorts.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={sort === key}
            onClick={() => onSortChange(key)}
            className={cn(
              "h-8 rounded-sm px-2.5 text-[11px] font-bold uppercase",
              sort === key ? "bg-ink text-paper" : "text-ink hover:bg-paper-2",
            )}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
      </div>

      {pins.length === 0 ? (
        <Empty
          title={`NOTHING FOR ${timeLabel.toUpperCase()}`}
          body="Try another time, or loosen the filters (open only, tags, status)."
        >
          <Button variant="outline" onClick={onOpenFilters} className="h-11 px-4">
            Open filters
          </Button>
        </Empty>
      ) : (
        <ol className="flex flex-col">
          {pins.map((pin, i) => {
            const status = pinStatus(pin)
            const voided = status.tone === "closed"
            const meta = [
              pin.trip && status.tone !== "closed" ? `${pin.trip.minutes} MIN` : null,
              pin.place.status === "visited" ? "VISITED" : "WISHLIST",
            ].filter(Boolean)
            return (
              <li key={pin.place.id}>
                <button
                  type="button"
                  onClick={() => onSelect(pin)}
                  className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1 rounded-sm px-2 py-2.5 text-left hover:bg-paper-2"
                >
                  <Leader
                    className={cn("text-[14px]", voided ? "text-ink-muted" : "font-bold")}
                    left={
                      <>
                        <span className="mr-2 text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                        <span className={cn("uppercase", voided && "line-through")}>{pin.place.name}</span>
                      </>
                    }
                    right={pin.trip ? receiptKm(pin.trip.km) : "—"}
                  />
                  <span className="pl-[3ch] text-[12px] leading-relaxed">
                    <StatusText tone={status.tone}>{status.text}</StatusText>
                    {meta.length > 0 && <span className="text-ink-muted"> · {meta.join(" · ")}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {pins.length > 0 && (
        <>
          <Rule className="mt-2" />
          <div className="flex justify-between pt-2 text-[13px] text-ink-muted">
            <span>ITEMS</span>
            <span>{pins.length}</span>
          </div>
          <div className="flex items-baseline justify-between text-base font-bold">
            <span>TOTAL OPEN</span>
            <Mark className="text-lg">{openCount}</Mark>
          </div>
          <p className="pt-4 text-center text-[11px] tracking-[0.14em] text-ink-muted">
            TERIMA KASIH · SELAMAT MAKAN
          </p>
        </>
      )}
    </div>
  )
}

function Empty({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="text-sm font-bold tracking-[0.08em]">{title}</p>
      <p className="text-[13px] text-ink-muted">{body}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
