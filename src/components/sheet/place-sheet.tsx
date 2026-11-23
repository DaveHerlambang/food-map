"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "cn"
import { Mark, VersionStamp, Zigzag } from "@/components/receipt/receipt"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"

/**
 * Snap heights. Numbers > 1 are pixels, ≤ 1 are fractions of the viewport.
 * PEEK shows the whole receipt header (title, time buttons, TOTAL OPEN, actions).
 */
export const SNAP_PEEK = 284
export const SNAP_HALF = 0.55
export const SNAP_FULL = 0.9
export const SNAP_POINTS = [SNAP_PEEK, SNAP_HALF, SNAP_FULL]

export type SheetSnap = number | string

/**
 * Mobile: the receipt slides up from the bottom over the map (non-modal, so the
 * map stays usable). It never closes — swiping below PEEK snaps back.
 */
export function PlaceSheet({
  snap,
  onSnapChange,
  header,
  children,
}: {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  header: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Drawer
      open
      onOpenChange={() => {
        /* never closes */
      }}
      modal={false}
      disablePointerDismissal
      snapPoints={SNAP_POINTS}
      snapPoint={snap}
      onSnapPointChange={(next) => onSnapChange(next ?? SNAP_PEEK)}
      showSwipeHandle
    >
      <DrawerContent className="drop-shadow-[0_-6px_24px_rgba(0,0,0,0.45)]">
        <DrawerTitle className="sr-only">Places</DrawerTitle>
        <div className="shrink-0 px-4 pt-1.5">{header}</div>
        {/*
          The popup is full height and slid down to the snap point, so the
          bottom (1 − SNAP_FULL) of it is always off-screen: pad for that.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(10dvh+env(safe-area-inset-bottom)+1.5rem)]">
          {children}
          {/* mobile: the end of the receipt, bottom-left */}
          <VersionStamp className="mt-6" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Web: the same receipt standing on the left of the map, torn at both ends.
 * It can be hidden (slides off to the left) to see the whole map; the
 * <PanelTab> in the top bar brings it back.
 */
export function SidePanel({
  header,
  children,
  collapsed,
  onCollapse,
}: {
  header: React.ReactNode
  children: React.ReactNode
  collapsed: boolean
  onCollapse: () => void
}) {
  return (
    <aside
      aria-label="Places"
      inert={collapsed}
      className={cn(
        "absolute bottom-5 left-5 top-5 z-10 flex w-[25rem] flex-col text-ink drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed && "pointer-events-none -translate-x-[calc(100%+2rem)] opacity-0",
      )}
    >
      <Zigzag side="top" />
      <div className="relative flex min-h-0 flex-1 flex-col bg-paper">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide the list"
          title="Hide the list"
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-paper-2 hover:text-ink"
        >
          <PanelLeftClose className="size-5" />
        </button>
        <div className="shrink-0 px-6 pt-4">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin]">
          {children}
        </div>
        {/* web: pinned to the bottom-left of the panel */}
        <div className="shrink-0 px-6 pb-2 pt-1">
          <VersionStamp />
        </div>
      </div>
      <Zigzag side="bottom" />
    </aside>
  )
}

/** Web, panel hidden: a receipt stub in the top bar that brings the panel back. */
export function PanelTab({ openCount, onExpand }: { openCount: number; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Show the list (${openCount} open)`}
      title="Show the list"
      className="group relative flex h-11 shrink-0 items-center gap-3 bg-paper pl-4 pr-3 text-ink drop-shadow-[0_3px_12px_rgba(0,0,0,0.5)]"
    >
      <span className="text-xs font-bold tracking-[0.14em]">FOOD MAP</span>
      <span className="text-xs font-bold">
        <Mark>{openCount}</Mark> OPEN
      </span>
      <PanelLeftOpen className="size-5 text-ink-muted group-hover:text-ink" />
      <Zigzag side="bottom" className="absolute inset-x-0 top-full" />
    </button>
  )
}
