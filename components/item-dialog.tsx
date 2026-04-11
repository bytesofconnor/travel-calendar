"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Link as LinkIcon, Plane, Trash2, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { COUNTRIES, getCountryForLocation, type Location, type TripItem, type TripItemInput } from "@/lib/kanban-store"

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: string | null
  editItem: TripItem | null
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
  const [location, setLocation] = useState<Location>("")
  const [locationTo, setLocationTo] = useState<Location | undefined>(undefined)
  const [isTravel, setIsTravel] = useState(false)
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [showLink, setShowLink] = useState(false)

  // Country selection state — null means "show country picker"
  const [locationCountry, setLocationCountry] = useState<string | null>(null)
  const [locationToCountry, setLocationToCountry] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    if (editItem) {
      setTitle(editItem.title)
      setNotes(editItem.notes ?? "")
      setStartDate(editItem.startDate)
      setEndDate(editItem.endDate)
      setLocation(editItem.location)
      setLocationTo(editItem.locationTo)
      setIsTravel(Boolean(editItem.locationTo))
      // Auto-detect countries from existing location IDs
      const fromCountry = getCountryForLocation(editItem.location)
      setLocationCountry(fromCountry?.id ?? null)
      const toCountry = editItem.locationTo ? getCountryForLocation(editItem.locationTo) : null
      setLocationToCountry(toCountry?.id ?? null)
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

    setTitle("")
    setNotes("")
    setStartDate(defaultDate ?? "")
    setEndDate(defaultDate ?? "")
    setLocation("")
    setLocationTo(undefined)
    setIsTravel(false)
    setLocationCountry(null)
    setLocationToCountry(null)
    setLinkLabel("")
    setLinkUrl("")
    setShowLink(false)
  }, [defaultDate, editItem, open])

  async function handleSave() {
    if (!title.trim() || !startDate || !endDate || !location) {
      return
    }

    await onSave(
      {
        title: title.trim(),
        notes: notes.trim() || undefined,
        startDate,
        endDate,
        location,
        locationTo: isTravel ? locationTo : undefined,
        link: showLink && linkUrl.trim()
          ? { label: linkLabel.trim() || "Link", url: linkUrl.trim() }
          : undefined,
      },
      editItem ?? undefined,
    )

    onOpenChange(false)
  }

  async function handleDelete() {
    if (!editItem) {
      return
    }

    await onDelete(editItem.id)
    onOpenChange(false)
  }

  function selectFromCountry(countryId: string) {
    const country = COUNTRIES.find((c) => c.id === countryId)
    if (!country) return
    setLocationCountry(countryId)
    // Auto-select the first location in that country if current location isn't in it
    const currentInCountry = country.locations.some((l) => l.id === location)
    if (!currentInCountry) {
      setLocation(country.locations[0].id)
    }
  }

  function selectToCountry(countryId: string) {
    const country = COUNTRIES.find((c) => c.id === countryId)
    if (!country) return
    setLocationToCountry(countryId)
    // Auto-select the first location in that country if current locationTo isn't in it
    const currentInCountry = locationTo && country.locations.some((l) => l.id === locationTo)
    if (!currentInCountry) {
      setLocationTo(country.locations[0].id)
    }
  }

  const fromCountryDef = COUNTRIES.find((c) => c.id === locationCountry)
  const toCountryDef = COUNTRIES.find((c) => c.id === locationToCountry)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100svh] w-[calc(100vw-1rem)] max-w-lg gap-0 overflow-y-auto rounded-3xl p-0 sm:max-h-[90vh] sm:w-full">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-medium">
            {editItem ? "Edit Item" : "Add Item"}
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {editItem?.authorName
              ? `Originally added by ${editItem.authorName}`
              : currentUserName
                ? `Saving as ${currentUserName}`
                : "Shared with your trip members"}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4">
          <Input
            placeholder="What's the plan?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 border-0 bg-secondary/50 text-base placeholder:text-muted-foreground focus-visible:ring-1"
            autoFocus
          />

          <Textarea
            placeholder="Add notes..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[120px] resize-none border-0 bg-secondary/50 text-base placeholder:text-muted-foreground focus-visible:ring-1 md:text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start</label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  if (!endDate || event.target.value > endDate) {
                    setEndDate(event.target.value)
                  }
                }}
                className="h-11 border-0 bg-secondary/50 text-base focus-visible:ring-1 md:text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">End</label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 border-0 bg-secondary/50 text-base focus-visible:ring-1 md:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setIsTravel(!isTravel)
                if (!isTravel) {
                  // Turning on travel: default "To" country to same as "From"
                  setLocationToCountry(locationCountry)
                  setLocationTo(undefined)
                }
              }}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isTravel
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="h-4 w-4" />
              {isTravel ? "Travel between locations" : "Add travel/transit"}
            </button>
          </div>

          {/* FROM / LOCATION picker */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              {locationCountry && (
                <button
                  type="button"
                  onClick={() => setLocationCountry(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  {fromCountryDef?.flag} {fromCountryDef?.name}
                </button>
              )}
              <label className="block text-xs font-medium text-muted-foreground">
                {locationCountry ? (isTravel ? "From" : "Location") : (isTravel ? "From — choose a country" : "Location — choose a country")}
              </label>
            </div>

            {locationCountry === null ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => selectFromCountry(country.id)}
                    className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-secondary/50 p-2 text-center transition-all hover:bg-secondary"
                  >
                    <span className="text-2xl leading-none">{country.flag}</span>
                    <span className="text-[10px] leading-tight text-foreground">{country.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {(fromCountryDef?.locations ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLocation(item.id)}
                    className={`flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center transition-all ${
                      location === item.id
                        ? "bg-secondary ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] leading-tight text-foreground">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TO picker (travel mode only) */}
          {isTravel && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                {locationToCountry && (
                  <button
                    type="button"
                    onClick={() => setLocationToCountry(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    {toCountryDef?.flag} {toCountryDef?.name}
                  </button>
                )}
                <label className="block text-xs font-medium text-muted-foreground">
                  {locationToCountry ? "To" : "To — choose a country"}
                </label>
              </div>

              {locationToCountry === null ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => selectToCountry(country.id)}
                      className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-secondary/50 p-2 text-center transition-all hover:bg-secondary"
                    >
                      <span className="text-2xl leading-none">{country.flag}</span>
                      <span className="text-[10px] leading-tight text-foreground">{country.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {(toCountryDef?.locations ?? [])
                    .filter((item) => item.id !== location)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLocationTo(item.id)}
                        className={`flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center transition-all ${
                          locationTo === item.id
                            ? "bg-secondary ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : "bg-secondary/50 hover:bg-secondary"
                        }`}
                      >
                        <div className="h-6 w-6 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] leading-tight text-foreground">{item.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {showLink ? (
            <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Link</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowLink(false)
                    setLinkLabel("")
                    setLinkUrl("")
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                placeholder="Label (e.g., Airbnb)"
                value={linkLabel}
                onChange={(event) => setLinkLabel(event.target.value)}
                className="h-11 border-0 bg-secondary/50 text-base focus-visible:ring-1 md:text-sm"
              />
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                className="h-11 border-0 bg-secondary/50 text-base focus-visible:ring-1 md:text-sm"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LinkIcon className="h-4 w-4" />
              Add link
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {editItem ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive sm:justify-center"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          ) : (
            <div />
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting} className="h-11 rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={!title.trim() || !startDate || !endDate || !location || isSaving || isDeleting}
              className="h-11 rounded-xl"
            >
              {isSaving ? "Saving..." : editItem ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
