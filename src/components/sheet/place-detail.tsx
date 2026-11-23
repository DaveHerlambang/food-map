"use client"

import { Navigation, Pencil } from "lucide-react"
import { cn } from "cn"
import { Barcode, KV, Rule, StatusText } from "@/components/receipt/receipt"
import { Button, buttonVariants } from "@/components/ui/button"
import { DAY, formatClock, hoursForDay } from "@/lib/hours"
import { clock, mapsDirectionsUrl, receiptKm, receiptStatus } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"
import type { Person } from "@/lib/places/types"

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/** One place, printed as its own receipt. */
export function PlaceDetail({
  pin,
  timeLabel,
  originLabel,
  people,
  userId,
  onBack,
  onEdit,
}: {
  pin: Pin
  /** e.g. "Tonight 00:30" when looking at a future time; null for now */
  timeLabel: string | null
  originLabel: string
  people: Person[]
  userId: string
  onBack: () => void
  onEdit: () => void
}) {
  const { place, state, t, trip, arrival, fits } = pin
  const status = receiptStatus(state, t, fits)
  const day = Math.floor(t / DAY)
  const dayHours = place.hours ? hoursForDay(place.hours, day) : []

  // You first, then your partner; anyone who rated but isn't listed shows as "Partner".
  const raters: Person[] = [
    ...people.filter((p) => p.id === userId),
    ...people.filter((p) => p.id !== userId),
    ...place.ratings
      .filter((r) => !people.some((p) => p.id === r.userId))
      .map((r) => ({ id: r.userId, name: "Partner" })),
  ]

  const tags = place.tags.map((tag) => `#${tag.name.replace(/\s+/g, "").toUpperCase()}`)

  return (
    <section aria-label={place.name} className="flex flex-col gap-2.5">
      <Rule />
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 self-start rounded-sm px-1 py-1 text-[12px] font-bold text-ink-muted hover:bg-paper-2 hover:text-ink"
      >
        &lt; ALL PLACES
      </button>

      <div className="text-center">
        <h2 className="text-lg font-bold uppercase leading-tight tracking-[0.06em]">{place.name}</h2>
        <p className="mt-1 text-[12px] text-ink-muted">
          {place.status === "visited" ? "VISITED" : "WISHLIST"}
          {tags.length > 0 && ` · ${tags.join(" ")}`}
        </p>
      </div>

      <Rule />
      <KV label="Status">
        <StatusText tone={status.tone}>
          {status.tone === "open" ? "OPEN" : status.tone === "soon" ? "CLOSING SOON" : status.tone === "closed" ? "CLOSED" : "UNKNOWN"}
        </StatusText>
      </KV>
      {(state.status === "open" || state.status === "closing") && (
        <KV label="Closes">
          <span className="font-bold">{state.closesAt === null ? "NEVER · 24H" : formatClock(state.closesAt)}</span>
        </KV>
      )}
      {state.status === "closed" && state.opensAt !== null && (
        <KV label="Opens">
          <span className="font-bold">{status.text.replace("VOID · OPENS ", "")}</span>
        </KV>
      )}
      <KV label={trip ? "Arrive" : "At"}>
        <span className="font-bold">
          {trip ? `~${clock(arrival)}` : (timeLabel ?? "NOW").toUpperCase()}
        </span>
      </KV>
      {trip && (
        <KV label="Distance">
          <span className="font-bold">
            ~{receiptKm(trip.km)} · {trip.minutes} MIN
          </span>
        </KV>
      )}
      {trip && (
        <KV label="From">
          <span className="uppercase">{originLabel}</span>
        </KV>
      )}
      <KV label={`Hours (${DAY_NAMES[day]})`}>
        <span>
          {dayHours.length ? dayHours.join(", ").toUpperCase() : place.hours ? "CLOSED" : "UNKNOWN"}
          {place.hoursSource === "inherit" && " · MALL"}
        </span>
      </KV>

      {raters.length > 0 && (
        <>
          <Rule />
          {raters.map((person) => {
            const rating = place.ratings.find((r) => r.userId === person.id)?.rating
            return (
              <KV key={person.id} label={person.name}>
                {rating ? (
                  <span className="tracking-[0.12em]" aria-label={`${rating} of 5 stars`}>
                    {"★".repeat(rating)}
                    <span className="text-rule">{"★".repeat(5 - rating)}</span>
                  </span>
                ) : (
                  <span className="text-ink-muted">NOT RATED</span>
                )}
              </KV>
            )
          })}
        </>
      )}

      {place.notes && (
        <>
          <Rule />
          <p className="whitespace-pre-line text-[13px] leading-relaxed">
            <span className="font-bold">NOTE: </span>“{place.notes}”
          </p>
        </>
      )}

      <Barcode className="mt-2 self-center" />
      <p className="text-center text-[11px] tracking-[0.14em] text-ink-muted">TERIMA KASIH · SELAMAT MAKAN</p>
      {place.address && <p className="text-center text-[11px] leading-relaxed text-ink-muted">{place.address}</p>}

      {status.tone === "open" && !trip && (
        <p className="text-center text-[11px] text-ink-muted">
          Set where you start to see distance and arrival time.
        </p>
      )}

      {/*
        Always within reach: sticks to the bottom of what is visible instead of
        sitting at the end of a long scroll. On mobile the sheet sets
        --sheet-offset / --sheet-gap so this clears the iPhone browser bar; on web
        they are unset (0). The ::before strip paints the gap below the bar so
        scrolled content doesn't show through it.
      */}
      <div className="sticky bottom-[calc(var(--sheet-offset,0px)+var(--sheet-gap,0px))] z-10 mt-2 bg-paper pb-2 pt-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-full before:h-[var(--sheet-gap,0px)] before:bg-paper before:content-['']">
        <Rule className="mb-2" />
        <div className="flex gap-1.5">
          <a
            href={mapsDirectionsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "h-12 flex-1 text-xs")}
          >
            <Navigation /> Open in Google Maps
          </a>
          <Button
            variant="outline"
            onClick={onEdit}
            aria-label="Edit place"
            className="size-12 [&_svg:not([class*='size-'])]:size-5"
          >
            <Pencil />
          </Button>
        </div>
      </div>
    </section>
  )
}
