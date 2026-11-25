import { cn } from "cn"
import type { Tone } from "@/lib/places/format"

/**
 * Struk v2 building blocks. Everything on paper is ink; lime is only a
 * highlighter behind ink; Barbados red is the one other ink.
 */

/** Dashed tear line between receipt sections. */
export function Rule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("border-t-[1.5px] border-dashed border-rule", className)} />
}

/** Torn paper edge. Place it directly above (top) or below (bottom) a paper surface. */
export function Zigzag({ side, className }: { side: "top" | "bottom"; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(side === "top" ? "zigzag-top" : "zigzag-bottom", "pointer-events-none shrink-0", className)}
    />
  )
}

/** The lime highlighter. Text stays ink. */
export function Mark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <mark className={cn("bg-lime px-1 text-ink [box-decoration-break:clone]", className)}>{children}</mark>
  )
}

/** "LABEL ............ VALUE" */
export function Leader({
  left,
  right,
  className,
}: {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("flex w-full min-w-0 items-baseline gap-1.5", className)}>
      <span className="min-w-0 truncate">{left}</span>
      <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-rule" />
      <span className="shrink-0">{right}</span>
    </span>
  )
}

/** Two-column receipt row. */
export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <span className="shrink-0 uppercase">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted", className)}>
      {children}
    </p>
  )
}

/** Status text with the right treatment for its tone. */
export function StatusText({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  if (tone === "open") return <Mark className="font-bold">{children}</Mark>
  if (tone === "soon") return <span className="font-bold text-barbados">{children}</span>
  return <span className="text-ink-muted">{children}</span>
}

/** App version, printed small at the bottom-left of the receipt. Source: package.json. */
export function VersionStamp({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] tracking-[0.14em] text-ink-muted", className)}>
      V{process.env.NEXT_PUBLIC_APP_VERSION}
    </p>
  )
}

/** A standalone receipt (login, empty states): paper torn at both ends. */
export function ReceiptCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full max-w-sm text-ink drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]", className)}>
      <Zigzag side="top" />
      <div className="flex flex-col gap-4 bg-paper px-6 py-6">{children}</div>
      <Zigzag side="bottom" />
    </div>
  )
}

const BARS = [2, 4, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4]

/** Decorative barcode. `scanning`: a fade runs across it (the loading splash). */
export function Barcode({ className, scanning = false }: { className?: string; scanning?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("flex h-7 gap-[2px]", className)}>
      {BARS.map((w, i) => (
        <span
          key={i}
          className={cn("bg-ink", scanning && "animate-barcode-scan motion-reduce:animate-none")}
          style={{ width: w, animationDelay: scanning ? `${i * 50}ms` : undefined }}
        />
      ))}
    </div>
  )
}
