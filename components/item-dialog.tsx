"use client"

import { useEffect, useState } from "react"
import { Link as LinkIcon, Plane, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TripItem, TripItemInput } from "@/lib/kanban-store"

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: string | null
  editItem: TripItem | null
  initialInput?: Partial<TripItemInput> | null
  initialTravel?: boolean
  currentUserName?: string
  isSaving?: boolean
  isDeleting?: boolean
  onSave: (input: TripItemInput, existingItem?: TripItem) => Promise<void> | void
  onDelete: (itemId: string) => Promise<void> | void
}

export function ItemDialog({
  open,
  onOpenChange,
  defaultDate,
  editItem,
  initialInput,
  initialTravel = false,
  currentUserName,
  isSaving = false,
  isDeleting = false,
  onSave,
  onDelete,
}: ItemDialogProps) {
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [locationTo, setLocationTo] = useState("")
  const [isTravel, setIsTravel] = useState(false)
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [showLink, setShowLink] = useState(false)

  useEffect(() => {
    if (!open) return

    if (editItem) {
      setTitle(editItem.title)
      setNotes(editItem.notes ?? "")
      setStartDate(editItem.startDate)
      setEndDate(editItem.endDate)
      setLocation(editItem.location)
      setLocationTo(editItem.locationTo ?? "")
      setIsTravel(Boolean(editItem.locationTo))
      if (editItem.link) {
        setLinkLabel(editItem.link.label)
        setLinkUrl(editItem.link.url)
        setShowLink(true)
      } else {
        setLinkLabel("")
        setLinkUrl("")
        setShowLink(false)
      }
      return
    }

    setTitle(initialInput?.title ?? "")
    setNotes(initialInput?.notes ?? "")
    setStartDate(initialInput?.startDate ?? defaultDate ?? "")
    setEndDate(initialInput?.endDate ?? initialInput?.startDate ?? defaultDate ?? "")
    setLocation(initialInput?.location ?? "")
    setLocationTo(initialInput?.locationTo ?? "")
    setIsTravel(Boolean(initialInput?.locationTo) || initialTravel)
    setLinkLabel(initialInput?.link?.label ?? "")
    setLinkUrl(initialInput?.link?.url ?? "")
    setShowLink(Boolean(initialInput?.link?.url))
  }, [defaultDate, editItem, initialInput, initialTravel, open])

  async function handleSave() {
    if (!title.trim() || !startDate || !endDate || !location.trim()) return

    await onSave(
      {
        title: title.trim(),
        notes: notes.trim() || undefined,
        startDate,
        endDate,
        location: location.trim(),
        locationTo: isTravel && locationTo.trim() ? locationTo.trim() : undefined,
        link:
          showLink && linkUrl.trim()
            ? { label: linkLabel.trim() || "Link", url: linkUrl.trim() }
            : undefined,
      },
      editItem ?? undefined,
    )

    onOpenChange(false)
  }

  async function handleDelete() {
    if (!editItem) return
    await onDelete(editItem.id)
    onOpenChange(false)
  }

  const canSave = Boolean(title.trim() && startDate && endDate && location.trim() && (!isTravel || locationTo.trim()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0 sm:my-4">
        <DialogHeader className="border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {editItem ? "Edit plan" : "Add for both of you"}
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground">
            {editItem?.authorName
              ? `Originally added by ${editItem.authorName}`
              : currentUserName
                ? `Saving as ${currentUserName} · visible to everyone on this trip`
                : "Visible to everyone on this trip"}
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-title">Plan</Label>
              <Input
                id="plan-title"
                placeholder="What's the plan?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 border-border bg-background text-base"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-notes">Notes</Label>
              <Textarea
                id="plan-notes"
                placeholder="Notes for your partner (optional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[100px] resize-none border-border bg-background text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan-start">Start</Label>
                <Input
                  id="plan-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value)
                    if (!endDate || event.target.value > endDate) {
                      setEndDate(event.target.value)
                    }
                  }}
                  className="h-11 border-border bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-end">End</Label>
                <Input
                  id="plan-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-11 border-border bg-background"
                />
              </div>
            </div>

            <button
              type="button"
              aria-pressed={isTravel}
              onClick={() => {
                setIsTravel((value) => !value)
                if (isTravel) setLocationTo("")
              }}
              className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isTravel ? "plan-travel-toggle plan-travel-toggle--on" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="h-4 w-4" aria-hidden="true" />
              {isTravel ? "Flight / transit" : "Mark as flight / transit"}
            </button>

            <div className={isTravel ? "grid gap-3 sm:grid-cols-2" : ""}>
              <div className="space-y-1.5">
                <Label htmlFor="plan-location">{isTravel ? "From" : "Where"}</Label>
                <Input
                  id="plan-location"
                  placeholder={isTravel ? "Cusco" : "Cusco, hotel, trailhead…"}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="h-11 border-border bg-background"
                />
              </div>
              {isTravel ? (
                <div className="space-y-1.5">
                  <Label htmlFor="plan-location-to">To</Label>
                  <Input
                    id="plan-location-to"
                    placeholder="Lima"
                    value={locationTo}
                    onChange={(event) => setLocationTo(event.target.value)}
                    className="h-11 border-border bg-background"
                  />
                </div>
              ) : null}
            </div>

            {showLink ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-link-label">Link label</Label>
                  <Input
                    id="plan-link-label"
                    placeholder="Booking"
                    value={linkLabel}
                    onChange={(event) => setLinkLabel(event.target.value)}
                    className="h-11 border-border bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-link-url">URL</Label>
                  <Input
                    id="plan-link-url"
                    placeholder="https://"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    className="h-11 border-border bg-background"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLink(true)}
                className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LinkIcon className="h-4 w-4" aria-hidden="true" />
                Add a booking or map link
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          {editItem ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting || isSaving}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full px-5"
              onClick={() => void handleSave()}
              disabled={!canSave || isSaving}
            >
              {isSaving ? "Saving…" : editItem ? "Save changes" : "Add plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
