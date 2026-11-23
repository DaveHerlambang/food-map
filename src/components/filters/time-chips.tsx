"use client"

import { Clock } from "lucide-react"
import { cn } from "cn"
import { TIME_PRESETS, type TimeChoice } from "@/lib/filters"

const chip =
  "relative flex h-10 min-w-0 flex-1 items-center justify-center rounded-sm border-[1.5px] border-ink px-1 text-xs font-bold transition-colors"
const idle = "bg-transparent text-ink hover:bg-paper-2"
const active = "bg-ink text-paper"

/**
 * NOW / 18:00 / 22:00 / 00:00 / [time picker] — receipt buttons, the active
 * one printed in reverse. Any other time comes from the native time picker
 * (wheel on iPhone, clock on Android) and means its next occurrence.
 */
export function TimeChips({
  value,
  label,
  onChange,
}: {
  value: TimeChoice
  /** resolved label of the current choice, e.g. "Tonight 01:15" */
  label: string
  onChange: (choice: TimeChoice) => void
}) {
  const isPreset = (hhmm: string) => value.kind === "next" && value.hhmm === hhmm
  const isCustom =
    value.kind === "on" ||
    (value.kind === "next" && !(TIME_PRESETS as readonly string[]).includes(value.hhmm))
  const customTime = isCustom ? value.hhmm : ""

  return (
    <div className="flex gap-1.5" role="group" aria-label="Time">
      <button
        type="button"
        aria-pressed={value.kind === "now"}
        onClick={() => onChange({ kind: "now" })}
        className={cn(chip, value.kind === "now" ? active : idle)}
      >
        NOW
      </button>
      {TIME_PRESETS.map((hhmm) => (
        <button
          key={hhmm}
          type="button"
          aria-pressed={isPreset(hhmm)}
          onClick={() => onChange({ kind: "next", hhmm })}
          className={cn(chip, isPreset(hhmm) ? active : idle)}
        >
          {hhmm}
        </button>
      ))}

      {/* Time picker: an invisible native time input laid over the chip. */}
      <label className={cn(chip, "cursor-pointer gap-1", isCustom ? cn(active, "flex-[1.4]") : idle)}>
        {isCustom ? (
          <span className="truncate uppercase">{value.kind === "on" ? label : customTime}</span>
        ) : (
          <Clock aria-hidden="true" className="size-4" />
        )}
        <input
          type="time"
          aria-label={isCustom ? `Custom time ${customTime}, change` : "Pick another time"}
          value={customTime}
          onChange={(e) => {
            if (/^\d{2}:\d{2}$/.test(e.target.value)) onChange({ kind: "next", hhmm: e.target.value })
          }}
          onClick={(e) => {
            // Desktop browsers only focus the field on click; open the picker instead.
            try {
              e.currentTarget.showPicker()
            } catch {
              // not supported or not allowed here: the focused field still works
            }
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
