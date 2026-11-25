import Link from "next/link"
import { ReceiptCard, Rule } from "@/components/receipt/receipt"

/** Any address that isn't the map: a receipt with nothing on it. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-map px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <ReceiptCard className="text-center">
        <h1 className="text-base font-bold tracking-[0.12em]">NO SUCH PAGE</h1>
        <Rule />
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Nothing is printed on this receipt. Everything lives on the map.
        </p>
        <Link
          href="/"
          className="flex h-11 w-full items-center justify-center rounded-md bg-ink text-xs font-bold tracking-[0.08em] text-paper hover:bg-ink/90"
        >
          BACK TO THE MAP
        </Link>
      </ReceiptCard>
    </main>
  )
}
