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
      <div className="border-b border-border px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Notes</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-2xl">Shared scratchpad</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Keep the floating trip stuff in one calm place: ideas, links, reservation reminders, restaurants, or anything you want to revisit together.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
            <span>{isSaving ? "Saving…" : isDirty ? "Changes not saved yet" : metaLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 md:px-4 md:py-6">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 pb-6">
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Start a shared brain dump. Jot down packing reminders, restaurant ideas, booking notes, or anything else that doesn’t need a date yet."
            className="min-h-[420px] flex-1 rounded-[18px] border-border/80 bg-black/35 px-5 py-5 text-base leading-8 text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur md:min-h-[520px] md:px-6 md:py-6 md:text-[15px]"
          />
        </div>
      </div>

      <footer className="border-t border-border/80 bg-background/70 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between text-xs text-muted-foreground/80">
          <span>Shared with everyone on this trip</span>
          <span>{draft.trim().length > 0 ? `${draft.trim().length} characters` : "Start typing anytime"}</span>
        </div>
      </footer>
    </section>
  )
}
