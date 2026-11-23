"use client"

import { LoaderCircle, RefreshCw } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-now"
import { refreshPlace } from "@/lib/actions/places"
import { syncedAgoLabel } from "@/lib/refresh-policy"

/** When the Google data was last refreshed, and a button to refresh it now. */
export function GoogleSync({ placeId, syncedAt }: { placeId: string; syncedAt: string | null }) {
  const now = useNow()
  const [pending, startRefresh] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run() {
    setError(null)
    startRefresh(async () => {
      const result = await refreshPlace(placeId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[11px] leading-snug text-ink-muted">
          GOOGLE DATA
          <br />
          {now === null ? "…" : syncedAgoLabel(syncedAt, now)}
        </p>
        <Button variant="outline" onClick={run} disabled={pending} className="h-9 shrink-0 px-3 text-[11px]">
          {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-bold text-barbados">
          {error}
        </p>
      )}
    </div>
  )
}
