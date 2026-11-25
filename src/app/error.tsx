"use client" // error boundaries must be Client Components

import Link from "next/link"
import { useEffect } from "react"
import { ReceiptCard, Rule, VersionStamp } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"

/**
 * Something broke while loading the map (Supabase, Google, the network).
 * A voided receipt instead of the framework's error screen, with a retry.
 * Sits under the root layout, so it also covers the member check in (app).
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // server errors reach the client as a generic message plus a digest that
  // matches the server log; show the digest so it can be looked up
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null

  return (
    <main className="flex min-h-dvh items-center justify-center bg-map px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <ReceiptCard className="text-center">
        <h1 className="text-base font-bold tracking-[0.12em]">VOID · TRY AGAIN</h1>
        <Rule />
        <p className="text-[13px] leading-relaxed text-ink-muted">
          The map couldn&apos;t load just now. It&apos;s usually the connection; trying again often
          fixes it.
        </p>
        <Button type="button" className="h-11 w-full text-xs" onClick={() => retry()}>
          Try again
        </Button>
        <Link
          href="/"
          className="text-[11px] font-bold tracking-[0.12em] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          BACK TO THE MAP
        </Link>
        {digest && (
          <>
            <Rule />
            <p className="text-[10px] tracking-[0.12em] text-ink-muted">REF {digest}</p>
          </>
        )}
        <VersionStamp className="self-start" />
      </ReceiptCard>
    </main>
  )
}
