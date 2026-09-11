"use client"

import { Loader2, NotebookPen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatRelativeTime, type TripNote } from "@/lib/kanban-store"
import { TabViewHeader } from "./tab-view-header"
import { TabViewShell } from "./tab-view-shell"

interface TripNotesViewProps {
  note: TripNote | null
  draft: string
  isDirty: boolean
  isSaving: boolean
  isOrganizing?: boolean
  organizeUndoExpiresAt?: number | null
  onDraftChange: (value: string) => void
  onOrganizeNotes: () => Promise<void> | void
  onUndoOrganize: () => void
}

export function TripNotesView({
  note,
  draft,
  isDirty,
  isSaving,
  isOrganizing = false,
  organizeUndoExpiresAt = null,
  onDraftChange,
  onOrganizeNotes,
  onUndoOrganize,
}: TripNotesViewProps) {
  const metaLabel = note
    ? note.authorName
      ? `Last edited by ${note.authorName} ${formatRelativeTime(note.updatedAt)}`
      : `Updated ${formatRelativeTime(note.updatedAt)}`
    : "Shared notes stay in sync for everyone on this trip."
  const hasUndoWindow = Boolean(organizeUndoExpiresAt && organizeUndoExpiresAt > Date.now())

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-2 md:hidden">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Shared planning notes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Route ideas, must-books, and research — synced for everyone.</p>
        </div>
      </div>

      <TabViewShell className="overflow-y-auto md:overflow-hidden">
        {hasUndoWindow ? (
          <div className="rounded-2xl border border-border/70 bg-secondary/55 px-3 py-3 md:mt-2 md:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Notes organized. Undo available for 10 seconds.</div>
              <Button variant="secondary" size="sm" className="rounded-full" onClick={onUndoOrganize}>
                Undo
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 md:hidden">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
            <span>{isSaving ? "Saving…" : isDirty ? "Unsaved changes" : metaLabel}</span>
          </div>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={() => void onOrganizeNotes()} disabled={isOrganizing || !draft.trim()}>
            {isOrganizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
            Organize
          </Button>
        </div>

        <TabViewHeader
          kicker="Notes"
          title="Shared planning notes"
          description="Route ideas, must-books, and research — synced for everyone on the trip."
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => void onOrganizeNotes()}
                disabled={isOrganizing || !draft.trim()}
              >
                {isOrganizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                Organize notes
              </Button>
              <div className="max-w-[320px] rounded-full border border-border/70 bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                  <span className="truncate">{isSaving ? "Saving…" : isDirty ? "Changes not saved yet" : metaLabel}</span>
                </div>
              </div>
            </>
          }
        />

        <div className="min-h-0 flex-1 pb-4 md:pb-0">
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Shared planning notes — routes, must-books, timing questions, food spots. Organize later with Ask."
            className="min-h-[65svh] resize-none overflow-y-auto rounded-[20px] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4 text-[15px] font-[450] leading-8 tracking-[0.01em] text-foreground placeholder:text-muted-foreground/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur [field-sizing:fixed] selection:bg-primary/25 md:h-full md:min-h-0 md:px-6 md:py-6 md:text-[15px]"
          />
        </div>
      </TabViewShell>
    </section>
  )
}
