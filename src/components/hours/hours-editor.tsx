"use client"

import { LoaderCircle, Plus, X } from "lucide-react"
import { cn } from "cn"
import { useState, useTransition } from "react"
import { Rule, SectionLabel } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { formatClock, type Interval } from "@/lib/hours"
import {
  DAY_LETTER,
  DAY_SHORT,
  MAX_SHIFTS,
  WEEK_ORDER,
  crossesMidnight,
  draftToIntervals,
  intervalsToDraft,
  parseClock,
  summarizeDraft,
  validateDraft,
  type HoursDraft,
  type HoursGroup,
} from "@/lib/hours-editor"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const toggle = "rounded-sm border-[1.5px] border-ink text-xs font-bold uppercase transition-colors"
const on = "bg-ink text-paper"
const off = "bg-transparent text-ink hover:bg-paper-2"

/**
 * "Usual hours" editor: set the hours once, tick the days it opens, and add
 * only the days that differ. The receipt at the bottom shows how it reads.
 * Renders the scrolling body and the save footer of a drawer.
 */
export function HoursEditor({
  initial,
  submitLabel,
  onSubmit,
  secondary,
}: {
  initial: Interval[] | null
  submitLabel: string
  /** Return an error message, or null when saved. */
  onSubmit: (intervals: Interval[]) => Promise<string | null>
  /** extra actions under the save button */
  secondary?: React.ReactNode
}) {
  const [draft, setDraft] = useState<HoursDraft>(() => intervalsToDraft(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  function save() {
    const problem = validateDraft(draft)
    if (problem) return setError(problem)
    setError(null)
    startSaving(async () => {
      const failure = await onSubmit(draftToIntervals(draft))
      if (failure) setError(failure)
    })
  }

  function toggleDay(day: number) {
    setDraft((d) => {
      const isOpen = d.openDays.includes(day)
      return {
        ...d,
        openDays: isOpen ? d.openDays.filter((x) => x !== day) : [...d.openDays, day],
        // a closed day can't have different hours
        exceptions: isOpen ? d.exceptions.map((e) => ({ ...e, days: e.days.filter((x) => x !== day) })) : d.exceptions,
      }
    })
  }

  function addException() {
    setDraft((d) => ({
      ...d,
      exceptions: [...d.exceptions, { ...copyGroup(d.usual), days: [] }],
    }))
  }

  function updateException(index: number, patch: Partial<HoursDraft["exceptions"][number]>) {
    setDraft((d) => ({
      ...d,
      exceptions: d.exceptions.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }))
  }

  function toggleExceptionDay(index: number, day: number) {
    const days = draft.exceptions[index].days
    updateException(index, { days: days.includes(day) ? days.filter((x) => x !== day) : [...days, day] })
  }

  return (
    <>
      <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto p-4">
        <Rule />
        <section className="flex flex-col gap-2">
          <SectionLabel>Usual hours</SectionLabel>
          <GroupFields group={draft.usual} onChange={(usual) => setDraft((d) => ({ ...d, usual }))} />
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Open on</SectionLabel>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={draft.openDays.includes(d)}
                aria-label={DAY_NAMES[d]}
                onClick={() => toggleDay(d)}
                className={cn(toggle, "h-11", draft.openDays.includes(d) ? on : off)}
              >
                {DAY_LETTER[d]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Different on some days</SectionLabel>
          {draft.exceptions.map((e, i) => (
            <div key={i} className="relative flex flex-col gap-3 rounded-sm border-[1.5px] border-ink p-3">
              <button
                type="button"
                aria-label="Remove these different hours"
                onClick={() => setDraft((d) => ({ ...d, exceptions: d.exceptions.filter((_, j) => j !== i) }))}
                className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-paper-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
              <div className="flex flex-wrap gap-1.5 pr-9">
                {WEEK_ORDER.filter((d) => draft.openDays.includes(d)).map((d) => {
                  const mine = e.days.includes(d)
                  const taken = !mine && draft.exceptions.some((o, j) => j !== i && o.days.includes(d))
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={taken}
                      aria-pressed={mine}
                      aria-label={DAY_NAMES[d]}
                      onClick={() => toggleExceptionDay(i, d)}
                      className={cn(
                        toggle,
                        "h-9 px-2.5",
                        mine ? on : off,
                        taken && "border-dashed border-rule text-rule hover:bg-transparent",
                      )}
                    >
                      {DAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>
              <GroupFields group={e} onChange={(g) => updateException(i, g)} />
            </div>
          ))}
          <button type="button" onClick={addException} className={cn(toggle, "flex h-10 items-center gap-1.5 self-start px-3", off)}>
            <Plus className="size-4" /> A different day
          </button>
        </section>

        <section className="flex flex-col gap-1.5 border-[1.5px] border-dashed border-rule px-3 py-2.5 text-[12px]">
          <SectionLabel>Reads as</SectionLabel>
          {summarizeDraft(draft).map((line) => (
            <div key={line.days} className={cn("flex items-baseline gap-2", line.closed && "text-ink-muted")}>
              <span className="font-bold">{line.days}</span>
              <span aria-hidden className="flex-1 -translate-y-[3px] border-b-[1.5px] border-dotted border-rule" />
              <span>{line.hours}</span>
            </div>
          ))}
        </section>

        {error && (
          <p role="alert" className="text-[13px] font-bold text-barbados">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Rule className="mb-3" />
        <Button onClick={save} disabled={saving} className="h-12 text-sm">
          {saving && <LoaderCircle className="animate-spin" />} {submitLabel}
        </Button>
        {secondary}
      </div>
    </>
  )
}

const copyGroup = (g: HoursGroup): HoursGroup => ({ allDay: g.allDay, shifts: g.shifts.map((s) => ({ ...s })) })

/** One set of hours: its shifts (or 24 hours). */
function GroupFields({ group, onChange }: { group: HoursGroup; onChange: (group: HoursGroup) => void }) {
  const setShift = (index: number, patch: Partial<HoursGroup["shifts"][number]>) =>
    onChange({ ...group, shifts: group.shifts.map((s, i) => (i === index ? { ...s, ...patch } : s)) })

  return (
    <div className="flex flex-col gap-2">
      {!group.allDay &&
        group.shifts.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <TimeInput label={i === 0 ? "Opens" : `Shift ${i + 1} opens`} value={s.open} onChange={(open) => setShift(i, { open })} />
            <span aria-hidden>→</span>
            <TimeInput label={i === 0 ? "Closes" : `Shift ${i + 1} closes`} value={s.close} onChange={(close) => setShift(i, { close })} />
            {crossesMidnight(s) && s.close !== s.open && (
              <span className="bg-lime px-1 py-0.5 text-[9px] font-bold tracking-[0.1em]">
                {s.close === 0 ? "MIDNIGHT" : "NEXT DAY"}
              </span>
            )}
            {group.shifts.length > 1 && (
              <button
                type="button"
                aria-label="Remove this shift"
                onClick={() => onChange({ ...group, shifts: group.shifts.filter((_, j) => j !== i) })}
                className="ml-auto flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-paper-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={group.allDay}
          onClick={() =>
            onChange({
              allDay: !group.allDay,
              // keep the shifts, so turning 24 hours off brings them back
              shifts: group.shifts.length ? group.shifts : [{ open: 10 * 60, close: 22 * 60 }],
            })
          }
          className={cn(toggle, "h-9 px-3", group.allDay ? on : off)}
        >
          24 hours
        </button>
        {!group.allDay && group.shifts.length < MAX_SHIFTS && (
          <button
            type="button"
            onClick={() => onChange({ ...group, shifts: [...group.shifts, { open: 17 * 60, close: 22 * 60 }] })}
            className={cn(toggle, "flex h-9 items-center gap-1 px-3", off)}
          >
            <Plus className="size-3.5" /> {group.shifts.length === 1 ? "Second shift" : "Another shift"}
          </button>
        )}
      </div>
    </div>
  )
}

/** Native time picker (the phone's wheel), in 15-minute steps. */
function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  return (
    <input
      type="time"
      step={900}
      aria-label={label}
      value={formatClock(value)}
      onChange={(e) => {
        const minutes = parseClock(e.target.value)
        if (minutes !== null) onChange(minutes)
      }}
      className="h-10 rounded-sm border-[1.5px] border-ink bg-paper px-2 text-base font-bold tabular-nums text-ink"
    />
  )
}
