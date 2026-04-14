"use client"

import { Loader2, NotebookPen } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { formatRelativeTime, type TripNote } from "@/lib/kanban-store"

interface TripNotesViewProps {
  note: TripNote | null
  draft: string
  isDirty: boolean
  isSaving: boolean
  onDraftChange: (value: string) => void
}

export function TripNotesView({ note, draft, isDirty, isSaving, onDraftChange }: TripNotesViewProps) {
  const metaLabel = note
    ? note.authorName
      ? `Last edited by ${note.authorName} ${formatRelativeTime(note.updatedAt)}`
      : `Updated ${formatRelativeTime(note.updatedAt)}`
    : "Shared notes sync across everyone on this trip."

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-2 md:px-6 md:py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:text-sm md:tracking-[0.2em]">
              Notes
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">Shared scratchpad</h2>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Shared notes for ideas, bookings, and reminders.
            </p>
          </div>
          <div className="hidden items-center gap-2 self-start rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-sm text-muted-foreground md:flex">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
            <span>{isSaving ? "Saving…" : isDirty ? "Changes not saved yet" : metaLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-3 py-2.5 md:px-4 md:py-6">
        <div className="flex h-full min-h-0 w-full max-w-5xl flex-col gap-2.5">
          <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-xs text-muted-foreground md:hidden">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
            <span>{isSaving ? "Saving…" : isDirty ? "Unsaved changes" : metaLabel}</span>
          </div>
          <div className="flex-1 min-h-0">
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Start a shared brain dump. Jot down packing reminders, restaurant ideas, booking notes, or anything else that doesn’t need a date yet."
              className="h-full min-h-0 resize-none overflow-y-auto rounded-[18px] border-border/80 bg-black/35 px-4 py-4 text-base leading-8 text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur md:px-6 md:py-6 md:text-[15px]"
            />
          </div>
        </div>
      </div>

    </section>
  )
}
