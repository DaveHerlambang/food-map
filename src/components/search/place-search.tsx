"use client"

import { useMap } from "@vis.gl/react-google-maps"
import { LoaderCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { SURABAYA } from "@/lib/geo"
import type { Suggestion } from "@/lib/google/places"

/**
 * Google place search (type-ahead) with session-token handling.
 * The session token covers all keystrokes and is handed to `onPick`, whose
 * Details call ends the session — that's what makes the keystrokes free.
 * Must be rendered inside <APIProvider> (biases results to the map's center).
 */
export function PlaceSearch({
  onPick,
  placeholder,
  autoFocus,
  emptyText = "NO RESULTS.",
  footer,
}: {
  /** Return an error message to show, or null on success. */
  onPick: (suggestion: Suggestion, sessionToken: string) => Promise<string | null>
  placeholder: string
  autoFocus?: boolean
  emptyText?: string
  /** shown under the results, given what was typed */
  footer?: (query: string) => React.ReactNode
}) {
  const map = useMap()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const sessionToken = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const inflight = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      inflight.current?.abort()
    },
    [],
  )

  function handleInput(value: string) {
    setQuery(value)
    setError(null)
    window.clearTimeout(timer.current)
    inflight.current?.abort()

    const input = value.trim()
    if (input.length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timer.current = window.setTimeout(() => search(input), 300)
  }

  async function search(input: string) {
    const controller = new AbortController()
    inflight.current = controller
    sessionToken.current ??= crypto.randomUUID()
    const center = map?.getCenter()

    try {
      const res = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          sessionToken: sessionToken.current,
          lat: center?.lat() ?? SURABAYA.lat,
          lng: center?.lng() ?? SURABAYA.lng,
        }),
        signal: controller.signal,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Search failed. Try again.")
      setResults(json.suggestions ?? [])
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : "Search failed. Try again.")
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  async function pick(s: Suggestion) {
    setPendingId(s.placeId)
    const token = sessionToken.current ?? ""
    sessionToken.current = null // the caller's Details call ends this session
    const failure = await onPick(s, token)
    setPendingId(null)
    if (failure) setError(failure)
  }

  const showEmpty = !loading && !error && query.trim().length >= 3 && results.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className="h-12 text-base"
      />

      {error && (
        <p role="alert" className="text-[13px] font-bold text-barbados">
          {error}
        </p>
      )}
      {loading && results.length === 0 && <p className="text-[13px] text-ink-muted">SEARCHING…</p>}
      {showEmpty && <p className="text-[13px] text-ink-muted">{emptyText}</p>}

      <ul className="flex-1 overflow-y-auto">
        {results.map((s) => (
          <li key={s.placeId} className="border-b-[1.5px] border-dashed border-rule last:border-b-0">
            <button
              type="button"
              disabled={pendingId !== null}
              onClick={() => pick(s)}
              className="flex w-full items-center gap-3 rounded-sm px-1 py-3 text-left hover:bg-paper-2 disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold uppercase">{s.main}</span>
                <span className="block truncate text-[12px] text-ink-muted">{s.secondary}</span>
              </span>
              {pendingId === s.placeId && <LoaderCircle className="size-5 animate-spin" />}
            </button>
          </li>
        ))}
      </ul>
      {footer?.(query)}
    </div>
  )
}
