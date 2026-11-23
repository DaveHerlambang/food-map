"use client"

import { Navigation, Pencil, X } from "lucide-react"
import { cn } from "cn"
import { Barcode, KV, Rule, StatusText } from "@/components/receipt/receipt"
import { Button, buttonVariants } from "@/components/ui/button"
import { DAY, formatClock, hoursForDay } from "@/lib/hours"
import { clock, mapsDirectionsUrl, pinStatus, receiptKm } from "@/lib/places/format"
import type { Pin } from "@/lib/places/pins"
import type { Person } from "@/lib/places/types"
import { GoogleSync } from "./google-sync"

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/**
 * Header of a selected place: close, name, status, distance and the two actions.
 * It replaces the list header while a place is open, so it is always the part
 * you grab to move the sheet (it never scrolls), and the actions can never end
 * up below the fold or under the browser bar.
 */
export function PlaceHeader({
  pin,
  onClose,
  onEdit,
}: {
  pin: Pin
  onClose: () => void
  onEdit: () => void
}) {
  const { place, trip } = pin
  const status = pinStatus(pin)

  return (
    <div className="flex flex-col gap-2.5 pb-3">
      {/* --header-reserve: room for the web panel's own hide button */}
      <div className="flex items-start gap-1.5 pr-[var(--header-reserve,0px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close this place and go back to the list"
          title="Close"
          className="-ml-1.5 flex size-10 shrink-0 items-center justify-center rounded-sm text-ink hover:bg-paper-2"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="truncate text-[15px] font-bold uppercase leading-snug tracking-[0.04em]">
            {place.name}
          </h2>
          <p className="truncate text-[12px] leading-relaxed">
            <StatusText tone={status.tone}>{status.text}</StatusText>
            {trip && (
              <span className="text-ink-muted">
                {" "}
                · ~{receiptKm(trip.km)} · {trip.minutes} MIN
              </span>
            )}
          </p>
        </div>
      </div>

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
  )
}

/** The rest of a selected place, printed as its own receipt below the header. */
export function PlaceDetail({
  pin,
  timeLabel,
  originLabel,
  people,
  userId,
}: {
  pin: Pin
  /** e.g. "Tonight 00:30" when looking at a future time; null for now */
  timeLabel: string | null
  originLabel: string
  people: Person[]
  userId: string
}) {
  const { place, state, t, trip, arrival } = pin
  const status = pinStatus(pin)
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
    <section aria-label={`${place.name}, details`} className="flex flex-col gap-2.5">
      <Rule />
      <p className="text-center text-[12px] text-ink-muted">
        {place.status === "visited" ? "VISITED" : "WISHLIST"}
        {tags.length > 0 && ` · ${tags.join(" ")}`}
      </p>

      <Rule />
      <KV label="Status">
        <StatusText tone={status.tone}>
          {status.tone === "open"
            ? "OPEN"
            : status.tone === "soon"
              ? "CLOSING SOON"
              : status.tone === "closed"
                ? "CLOSED"
                : "UNKNOWN"}
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
        <span className="font-bold">{trip ? `~${clock(arrival)}` : (timeLabel ?? "NOW").toUpperCase()}</span>
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
      {status.tone === "open" && !trip && (
        <p className="text-[11px] text-ink-muted">Set where you start to see distance and arrival time.</p>
      )}

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

      {place.googlePlaceId && (
        <>
          <Rule />
          <GoogleSync placeId={place.id} syncedAt={place.googleSyncedAt} />
        </>
      )}
    </section>
  )
}
