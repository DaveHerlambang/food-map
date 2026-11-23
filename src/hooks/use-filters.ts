"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { parseFilters, serializeFilters, type Filters } from "@/lib/filters"

/**
 * Filter state, mirrored to the URL (?at=22:00&stay=60&open=1…) so a refresh
 * keeps it and a link can be sent to your partner. Uses the native History
 * API, which Next.js syncs with useSearchParams without refetching the page.
 */
export function useFilters() {
  const params = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters(new URLSearchParams(params.toString())),
  )

  useEffect(() => {
    const qs = serializeFilters(filters)
    const next = qs ? `?${qs}` : window.location.pathname
    const current = window.location.search || window.location.pathname
    if (next !== current) window.history.replaceState(null, "", next)
  }, [filters])

  return [filters, setFilters] as const
}
