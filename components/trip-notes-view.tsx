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

export function TripNotesView({
  note,
  draft,
  isDirty,
  isSaving,
  onDraftChange,
}: TripNotesViewProps) {
  const metaLabel = note
    ? note.authorName
      ? `Last edited by ${note.authorName} ${formatRelativeTime(note.updatedAt)}`
      : `Updated ${formatRelativeTime(note.updatedAt)}`
    : "Shared brainstorming syncs across everyone on this trip."

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-2 md:hidden">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Brainstorm</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Ideas and research</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Shared notes, prompts, and trip thinking in one place.</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 md:overflow-hidden md:px-0 md:py-0">
        <div className="flex min-h-full w-full flex-col gap-4 md:h-full md:min-h-0">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
              <span>{isSaving ? "Saving…" : isDirty ? "Unsaved changes" : metaLabel}</span>
            </div>
          </div>

          <div className="hidden md:block md:px-0 md:pt-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:text-sm md:tracking-[0.2em]">
              Brainstorm
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">Ideas and research</h2>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Shared notes, prompts, and trip thinking in one place.
            </p>
          </div>

          <div className="hidden items-start justify-between gap-4 md:flex">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <NotebookPen className="h-3.5 w-3.5" />
                Shared Brainstorm
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">Shared trip notes</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Capture route thoughts, notes, and rough ideas while the copilot stays available alongside the trip.
              </p>
            </div>
            <div className="max-w-[320px] rounded-full border border-border/70 bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                <span className="truncate">{isSaving ? "Saving…" : isDirty ? "Changes not saved yet" : metaLabel}</span>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 pb-4 md:pb-5">
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Start a shared brain dump. Jot down restaurant ideas, route thoughts, timing questions, booking reminders, or anything else that still needs figuring out."
              className="min-h-[65svh] resize-none overflow-y-auto rounded-[20px] border-border/70 bg-black/28 px-4 py-4 text-base leading-8 text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur [field-sizing:fixed] md:h-full md:min-h-0 md:px-6 md:py-6 md:text-[15px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
