"use client"

import {
  Building2,
  Coffee,
  Dumbbell,
  GraduationCap,
  Heart,
  House,
  MapPin,
  Star,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { ANCHOR_ICONS, ANCHOR_ICON_LABELS, type AnchorIcon } from "@/lib/anchor-icons"

const GLYPHS: Record<AnchorIcon, LucideIcon> = {
  home: House,
  work: Building2,
  campus: GraduationCap,
  gym: Dumbbell,
  family: Heart,
  cafe: Coffee,
  star: Star,
  pin: MapPin,
}

/** The icon of a saved starting point. */
export function AnchorGlyph({ icon, className }: { icon: AnchorIcon; className?: string }) {
  const Glyph = GLYPHS[icon]
  return <Glyph aria-hidden className={className} />
}

/** Eight icons to choose from, as toggle tiles. */
export function AnchorIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: AnchorIcon
  onChange: (icon: AnchorIcon) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Icon">
      {ANCHOR_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          disabled={disabled}
          onClick={() => onChange(icon)}
          className={cn(
            "flex h-14 flex-col items-center justify-center gap-1 rounded-sm border-[1.5px] border-ink text-[10px] font-bold uppercase tracking-[0.06em] transition-colors disabled:opacity-60",
            value === icon ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-paper-2",
          )}
        >
          <AnchorGlyph icon={icon} className="size-5" />
          {ANCHOR_ICON_LABELS[icon]}
        </button>
      ))}
    </div>
  )
}
