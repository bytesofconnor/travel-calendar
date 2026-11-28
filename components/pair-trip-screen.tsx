"use client"

import { useEffect, useState } from "react"

import { AddTripButton, type CaptureKind } from "@/components/capture-dock"
import { PageInset, PageShell } from "@/components/page-shell"
import { EditTripDialog } from "@/components/edit-trip-dialog"
import { ItemDialog } from "@/components/item-dialog"
import { TripStoryView } from "@/components/trip-story-view"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTripDateRange } from "@/lib/format-dates"
import type { TripItem, TripItemInput } from "@/lib/kanban-store"
import { guessPlanType } from "@/lib/plan-form"
import type { PlanType } from "@/lib/plan-types"
import type { MemberView, SharedItem } from "@/lib/shared-trip"

function storyItem(item: SharedItem, tripId: string, createdBy: string): TripItem {
  return {
    id: item.id,
    tripId,
    title: item.title,
    notes: item.notes ?? undefined,
    startDate: item.startDate,
    endDate: item.endDate,
    location: item.location,
    locationTo: item.locationTo ?? undefined,
    createdBy,
    createdAt: "",
    updatedAt: "",
  }
}

async function postPair(body: object): Promise<MemberView> {
  const response = await fetch("/api/review-pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as { error?: string } | MemberView | null
  if (!response.ok || !payload || !("trip" in payload)) {
    const message = payload && "error" in payload ? payload.error : undefined
    throw new Error(message ?? "Unable to save the trip.")
  }
  return payload
}

export function PairTripScreen({ roomId, member }: { roomId: string; member: "owner" | "partner" }) {
  const [view, setView] = useState<MemberView | null>(null)
  const [error, setError] = useState("")
  const [draft, setDraft] = useState<string | null>(null)
  const [editingTrip, setEditingTrip] = useState(false)
  const [tripName, setTripName] = useState("")
  const [tripStart, setTripStart] = useState("")
  const [tripEnd, setTripEnd] = useState("")
  const [itemOpen, setItemOpen] = useState(false)
  const [editItem, setEditItem] = useState<TripItem | null>(null)
  const [initialInput, setInitialInput] = useState<Partial<TripItemInput> | null>(null)
  const [initialType, setInitialType] = useState<PlanType | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let timer = 0
    async function poll() {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch(`/api/review-pair?room=${encodeURIComponent(roomId)}&member=${member}`, {
            cache: "no-store",
            signal: controller.signal,
          })
          if (response.ok) setView((await response.json()) as MemberView)
        } catch {
          if (controller.signal.aborted) return
        }
        await new Promise((resolve) => {
          timer = window.setTimeout(resolve, 200)
        })
      }
    }
    void poll()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [member, roomId])

  const savedNote = view?.trip.note ?? ""
  useEffect(() => {
    if (draft === null || draft === savedNote) return
    const timeout = window.setTimeout(() => {
      void postPair({ roomId, member, action: "note.save", content: draft })
        .then((next) => {
          setView(next)
          setError("")
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Unable to save the note.")
        })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [draft, member, roomId, savedNote])

  if (!view) {
    return (
      <PageShell className="flex min-h-dvh items-center justify-center">
        <PageInset width="read">
          <p className="text-sm text-muted-foreground">Loading trip</p>
        </PageInset>
      </PageShell>
    )
  }

  const trip = view.trip
  const items = trip.items.map((item) => storyItem(item, trip.id, member))
  const noteText = savedNote.trim() ? savedNote : "No shared note yet"

  function openCapture(kind?: CaptureKind, text?: string) {
    const baseDate = trip.startDate
    const typed = kind ?? (text?.trim() ? guessPlanType(text) : null)
    setEditItem(null)
    setInitialType(typed)
    setInitialInput({
      title: text?.trim() ?? "",
      startDate: baseDate,
      endDate: baseDate,
    })
    setItemOpen(true)
  }

  async function saveItem(input: TripItemInput, existing?: TripItem) {
    setIsSaving(true)
    setError("")
    try {
      const next = await postPair({
        roomId,
        member,
        action: existing ? "item.update" : "item.create",
        itemId: existing?.id,
        title: input.title,
        notes: input.notes,
        startDate: input.startDate,
        endDate: input.endDate,
        location: input.location,
        locationTo: input.locationTo,
      })
      setView(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the plan.")
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePlan(itemId: string) {
    setIsSaving(true)
    setError("")
    try {
      setView(await postPair({ roomId, member, action: "item.remove", itemId }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the plan.")
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageShell className="page-frame">
      <div className="page-frame__column page-frame__column--add">
      <div className="story-scroll">
        <PageInset className="pb-8 pt-6">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{view.trip.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="trip-dates" data-start={view.trip.startDate} data-end={view.trip.endDate}>
                {formatTripDateRange(view.trip.startDate, view.trip.endDate)}
              </p>
            </div>
            {view.viewerRole === "owner" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => {
                  setTripName(view.trip.name)
                  setTripStart(view.trip.startDate)
                  setTripEnd(view.trip.endDate)
                  setEditingTrip(true)
                }}
              >
                Edit trip
              </Button>
            ) : null}
          </header>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <TripStoryView
            className="mt-2"
            mode="trip"
            items={items}
            today="2026-11-15"
            tripStart={view.trip.startDate}
            tripEnd={view.trip.endDate}
            packingChecked={0}
            packingTotal={0}
            notesCount={savedNote.trim() ? 1 : 0}
            onEditItem={(item) => {
              setEditItem(item)
              setInitialInput(null)
              setInitialType(null)
              setItemOpen(true)
            }}
            onStartFlight={() => openCapture("flight")}
            onStartStay={() => openCapture("stay")}
            onStartPlace={() => openCapture("place")}
            onInvite={() => undefined}
            onOpenPacking={() => undefined}
            onOpenNotes={() => document.getElementById("shared-note-draft")?.focus()}
            onOpenAsk={() => undefined}
          />
          <div className="mt-6 space-y-2">
            <Label htmlFor="shared-note-draft">Shared planning notes</Label>
            <Textarea
              id="shared-note-draft"
              value={draft ?? savedNote}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-28"
            />
            <p role="status" aria-label="Shared note">
              {noteText}
            </p>
          </div>
        </PageInset>
      </div>
      <AddTripButton onAdd={() => openCapture()} />
      </div>
      <ItemDialog
        open={itemOpen}
        onOpenChange={(open) => {
          setItemOpen(open)
          if (!open) {
            setEditItem(null)
            setInitialInput(null)
            setInitialType(null)
          }
        }}
        defaultDate={view.trip.startDate}
        editItem={editItem}
        initialInput={initialInput}
        initialType={initialType}
        placeHint="Lisbon"
        currentUserName={member === "owner" ? "Avery" : "Blair"}
        isSaving={isSaving}
        onSave={saveItem}
        onDelete={deletePlan}
      />
      <EditTripDialog
        open={editingTrip}
        onOpenChange={setEditingTrip}
        tripName={tripName}
        onTripNameChange={setTripName}
        tripStart={tripStart}
        onTripStartChange={(value) => {
          setTripStart(value)
          if (!tripEnd || value > tripEnd) setTripEnd(value)
        }}
        tripEnd={tripEnd}
        onTripEndChange={setTripEnd}
        onCancel={() => setEditingTrip(false)}
        onSave={() => {
          setIsSaving(true)
          setError("")
          void postPair({
            roomId,
            member,
            action: "trip.update",
            name: tripName.trim(),
            startDate: tripStart,
            endDate: tripEnd,
          })
            .then((next) => {
              setView(next)
              setEditingTrip(false)
            })
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : "Unable to update the trip.")
            })
            .finally(() => setIsSaving(false))
        }}
        saveDisabled={
          !tripName.trim() ||
          !tripStart ||
          !tripEnd ||
          (tripName.trim() === view.trip.name && tripStart === view.trip.startDate && tripEnd === view.trip.endDate)
        }
        isSaving={isSaving}
      />
    </PageShell>
  )
}
