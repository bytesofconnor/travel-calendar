"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { Link as LinkIcon, Trash2 } from "lucide-react"

import { AttendeeToggles, type AttendeeMember } from "@/components/attendee-faces"
import { PlaceField, PlacePopoverProvider } from "@/components/place-field"
import { DraftWeather, useWeatherUnits } from "@/components/weather-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { resolveAttendance } from "@/lib/attendees"
import { TIME_ZONE_CHOICES, airportTimeZone, timeZoneLabel } from "@/lib/calendar/airports"
import {
  buildPlan,
  draftErrors,
  draftTitle,
  fieldsFromItem,
  fieldsFromNew,
  flightWhen,
  guessPlanType,
  headingFor,
  seedPlanType,
  saveLabel,
  stayPlaceholder,
  type PlanDraft,
} from "@/lib/plan-form"
import type { GeoPlace, PlanType, TravelMode } from "@/lib/plan-types"
import { modeKeepsArriveDay, TRAVEL_MODES } from "@/lib/travel-mode"
import { travelIcon } from "@/components/travel-mark"
import type { TripItem, TripItemInput } from "@/lib/kanban-store"
import type { WeatherUnits } from "@/lib/weather"

const TYPES: { id: PlanType; label: string }[] = [
  { id: "stay", label: "Stay" },
  { id: "flight", label: "Travel" },
  { id: "place", label: "Activity" },
  { id: "note", label: "Note" },
]

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: string | null
  editItem: TripItem | null
  initialInput?: Partial<TripItemInput> | null
  initialType?: PlanType | null
  placeHint?: string
  units?: WeatherUnits
  currentUserName?: string
  members?: AttendeeMember[]
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
  initialType = null,
  placeHint = "",
  units,
  currentUserName,
  members = [],
  isSaving = false,
  isDeleting = false,
  onSave,
  onDelete,
}: ItemDialogProps) {
  const fallbackDate = defaultDate || new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState<PlanDraft>(() => fieldsFromNew("place", null, fallbackDate))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showLink, setShowLink] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showZones, setShowZones] = useState(false)
  const [attendeeIds, setAttendeeIds] = useState<string[] | undefined>(undefined)
  const errorSummary = useId()
  const returnFocus = useRef<HTMLElement | null>(null)
  const captureRef = useRef<HTMLInputElement>(null)
  const [capture, setCapture] = useState("")
  const [typeLocked, setTypeLocked] = useState(false)
  const { units: weatherUnits } = useWeatherUnits(units)
  const hint = stayPlaceholder(placeHint)

  useLayoutEffect(() => {
    if (!open) return
    const current = document.activeElement
    if (current instanceof HTMLElement && !current.closest("[role=dialog]")) {
      returnFocus.current = current
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const next = editItem
      ? fieldsFromItem(editItem)
      : fieldsFromNew(initialType ?? seedPlanType(initialInput), initialInput ?? null, fallbackDate)
    setDraft(next)
    setCapture(editItem ? "" : (initialInput?.title ?? ""))
    setTypeLocked(Boolean(editItem) || initialType != null)
    setErrors({})
    setShowLink(Boolean(next.linkUrl))
    setShowDetails(Boolean(next.notes || next.address || next.confirmation || next.linkUrl))
    setShowZones(false)
    setAttendeeIds(editItem?.attendeeIds ?? initialInput?.attendeeIds)
  }, [editItem, fallbackDate, initialInput, initialType, open])

  function patch(partial: Partial<PlanDraft>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function applyCapture(text: string, type: PlanType, current: PlanDraft): PlanDraft {
    const next = fieldsFromNew(
      type,
      {
        title: text,
        startDate: current.startDate,
        endDate: current.endDate,
        planType: type,
      },
      current.startDate || fallbackDate,
    )
    return { ...next, startDate: current.startDate, endDate: current.endDate }
  }

  function onCaptureChange(text: string) {
    setCapture(text)
    setDraft((current) => {
      const type = typeLocked ? current.type : guessPlanType(text)
      if (!text.trim()) return applyCapture("", typeLocked ? current.type : "place", current)
      return applyCapture(text, type, current)
    })
  }

  function chooseType(type: PlanType) {
    setTypeLocked(true)
    setDraft((current) => (capture.trim() ? applyCapture(capture, type, current) : { ...current, type }))
  }

  function onTypeKey(event: KeyboardEvent<HTMLButtonElement>) {
    const current = event.currentTarget.id.replace("plan-type-", "")
    const index = TYPES.findIndex((type) => type.id === current)
    let next = index
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % TYPES.length
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + TYPES.length) % TYPES.length
    else return
    event.preventDefault()
    const type = TYPES[next]?.id
    if (!type) return
    chooseType(type)
    document.getElementById(`plan-type-${type}`)?.focus()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (isSaving) return
    const found = draftErrors(draft)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      if (found.address || found.linkUrl) setShowDetails(true)
      window.requestAnimationFrame(() => document.getElementById(controlId(first))?.focus())
      return
    }
    const input = buildPlan(draft, fallbackDate)
    if (!input) return
    const memberIds = members.map((member) => member.userId)
    const attendance = resolveAttendance(attendeeIds, memberIds)
    try {
      await onSave(
        {
          ...input,
          ...(members.length > 0 ? { attendeeIds: attendance.everyone ? [] : attendance.includedIds } : {}),
        },
        editItem ?? undefined,
      )
      onOpenChange(false)
    } catch {
      setErrors({ form: "Couldn't save that plan. Try again." })
    }
  }

  const titlePreview = draftTitle(draft)
  const described = (key: string, id: string) => (errors[key] ? `${id}-error` : undefined)
  const editing = Boolean(editItem)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0"
        onCloseAutoFocus={(event) => {
          const target = returnFocus.current
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
        onOpenAutoFocus={(event) => {
          if (editItem) return
          event.preventDefault()
          captureRef.current?.focus()
        }}
      >
        <PlacePopoverProvider>
        <form onSubmit={(event) => void onSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {editing ? null : (
              <input
                ref={captureRef}
                id="plan-capture"
                className="h-11 min-h-11 w-[calc(100%-2.75rem)] shrink-0 rounded-md border border-foreground bg-background px-3 text-base font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Add to the trip…"
                placeholder="Add to the trip…"
                value={capture}
                autoComplete="off"
                onChange={(event) => onCaptureChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault()
                }}
              />
            )}
            <div role="radiogroup" aria-label="Plan type" className="flex shrink-0 flex-wrap gap-1.5 pr-10">
              {TYPES.map((type) => {
                const selected = draft.type === type.id
                return (
                  <button
                    key={type.id}
                    id={`plan-type-${type.id}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => chooseType(type.id)}
                    onKeyDown={onTypeKey}
                    className={`h-11 min-h-11 min-w-[4.5rem] flex-1 rounded-md border border-foreground px-2 text-sm font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "bg-foreground text-background" : "bg-background text-foreground"
                    }`}
                  >
                    {type.label}
                  </button>
                )
              })}
            </div>
            <DialogHeader className="border-b border-border px-0 pb-3 pr-10 text-left">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                {headingFor(draft.type, editing, draft.mode)}
              </DialogTitle>
              {editing && editItem?.authorName ? (
                <p className="text-sm text-foreground">Added by {editItem.authorName}</p>
              ) : null}
            </DialogHeader>
            <div
              id={errorSummary}
              aria-live="polite"
              className={Object.keys(errors).length > 0 ? "text-sm font-medium text-destructive" : "sr-only"}
            >
              {Object.values(errors).join(" ")}
            </div>

            {draft.type === "flight" ? (
              <ModePicker
                mode={draft.mode}
                onChange={(mode) => {
                  setShowZones(false)
                  patch({
                    mode,
                    ...(modeKeepsArriveDay(mode) ? {} : { endDate: draft.startDate || draft.endDate }),
                  })
                }}
              />
            ) : null}

            <SmoothFields watch={`${draft.type}:${draft.mode}`}>
            {draft.type === "stay" ? (
              <>
                <PlaceField
                  id="plan-location"
                  label="Where are you staying?"
                  value={draft.where}
                  placeholder={hint}
                  invalid={Boolean(errors.where)}
                  describedBy={described("where", "plan-location")}
                  bias={placeHint}
                  selected={draft.wherePlace}
                  onText={(where) => patch({ where, wherePlace: placeStillMatches(where, draft.wherePlace) })}
                  onPlace={(place) => patch({ where: place.label || place.name, wherePlace: place })}
                />
                <FieldError id="plan-location-error" message={errors.where} />
                <TitleField
                  value={draft.customTitle}
                  placeholder={titlePreview || "Title"}
                  onChange={(customTitle) => patch({ customTitle, titleEdited: true })}
                />
              </>
            ) : null}

            {draft.type === "flight" ? (
              <>
                <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <PlaceField
                    id="plan-location"
                    label="From"
                    value={draft.from}
                    placeholder={draft.mode === "flight" ? "City or airport" : modeKeepsArriveDay(draft.mode) ? "Station or city" : "Place or address"}
                    flight={draft.mode === "flight"}
                    invalid={Boolean(errors.from)}
                    describedBy={described("from", "plan-location")}
                    bias={placeHint}
                    selected={draft.fromPlace}
                    onText={(from) => patch({ from, fromPlace: placeStillMatches(from, draft.fromPlace) })}
                    onPlace={(place) =>
                      patch({
                        from: place.label || place.name,
                        fromPlace: place,
                        ...(place.timeZone ? { startZone: place.timeZone } : {}),
                      })
                    }
                  />
                  <PlaceField
                    id="plan-location-to"
                    label="To"
                    value={draft.to}
                    placeholder={
                      draft.mode === "flight"
                        ? placeHint || "City or airport"
                        : modeKeepsArriveDay(draft.mode)
                          ? "Station or city"
                          : "Place or address"
                    }
                    flight={draft.mode === "flight"}
                    invalid={Boolean(errors.to)}
                    describedBy={described("to", "plan-location-to")}
                    bias={placeHint}
                    selected={draft.toPlace}
                    onText={(to) => patch({ to, toPlace: placeStillMatches(to, draft.toPlace) })}
                    onPlace={(place) =>
                      patch({
                        to: place.label || place.name,
                        toPlace: place,
                        ...(place.timeZone ? { endZone: place.timeZone } : {}),
                      })
                    }
                  />
                </div>
                <FieldError id="plan-location-error" message={errors.from} />
                <FieldError id="plan-location-to-error" message={errors.to} />
                <TitleField
                  value={draft.customTitle}
                  placeholder={titlePreview || (draft.mode === "flight" ? "Fly from one place to another" : "Title fills in from the places")}
                  describedBy={described("customTitle", "plan-title")}
                  invalid={Boolean(errors.customTitle)}
                  onChange={(customTitle) => patch({ customTitle, titleEdited: true })}
                />
                <FieldError id="plan-title-error" message={errors.customTitle} />
              </>
            ) : null}

            {draft.type === "place" ? (
              <>
                <TextField
                  id="plan-title"
                  label="What are you doing?"
                  value={draft.name}
                  placeholder="Coffee, museum, dinner"
                  invalid={Boolean(errors.name)}
                  describedBy={described("name", "plan-title")}
                  onChange={(name) => patch({ name })}
                />
                <FieldError id="plan-title-error" message={errors.name} />
                <PlaceField
                  id="plan-where"
                  label="Where"
                  value={draft.where}
                  placeholder={placeHint || "Neighborhood or address"}
                  bias={placeHint}
                  selected={draft.wherePlace}
                  onText={(where) => patch({ where, wherePlace: placeStillMatches(where, draft.wherePlace) })}
                  onPlace={(place) => patch({ where: place.label || place.name, wherePlace: place })}
                />
              </>
            ) : null}

            {draft.type === "note" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-title">Note</Label>
                  <Textarea
                    id="plan-title"
                    value={draft.name}
                    placeholder="What should everyone remember?"
                    aria-invalid={Boolean(errors.name) || undefined}
                    aria-describedby={described("name", "plan-title")}
                    onChange={(event) => patch({ name: event.target.value })}
                    className="min-h-24 resize-none border-border bg-background text-base"
                  />
                  <FieldError id="plan-title-error" message={errors.name} />
                </div>
              </>
            ) : null}

            {draft.type === "stay" ? (
              <DatePair
                startLabel="Check-in"
                endLabel="Check-out"
                start={draft.startDate}
                end={draft.endDate}
                startError={errors.startDate}
                endError={errors.endDate}
                onStart={(startDate) => patch({ startDate, endDate: !draft.endDate || startDate > draft.endDate ? startDate : draft.endDate })}
                onEnd={(endDate) => patch({ endDate })}
              />
            ) : null}

            {draft.type === "flight" && modeKeepsArriveDay(draft.mode) ? (
              <>
                <DatePair
                  startLabel="Depart"
                  endLabel="Arrive"
                  start={draft.startDate}
                  end={draft.endDate}
                  startError={errors.startDate}
                  endError={errors.endDate}
                  onStart={(startDate) => patch({ startDate, endDate: !draft.endDate || startDate > draft.endDate ? startDate : draft.endDate })}
                  onEnd={(endDate) => patch({ endDate })}
                />
                <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <TextField id="plan-depart" label="Depart time" type="time" value={draft.startTime} onChange={(startTime) => patch({ startTime })} />
                  <TextField id="plan-arrive" label="Arrive time" type="time" value={draft.endTime} onChange={(endTime) => patch({ endTime })} />
                </div>
                {draft.mode === "flight" ? (
                  <FlightClock
                    draft={draft}
                    showZones={showZones}
                    onShowZones={() => setShowZones(true)}
                    onDepartZone={(startZone) => patch({ startZone })}
                    onArriveZone={(endZone) => patch({ endZone })}
                  />
                ) : null}
              </>
            ) : null}

            {draft.type === "flight" && !modeKeepsArriveDay(draft.mode) ? (
              <>
                <TextField
                  id="plan-start"
                  label="Date"
                  type="date"
                  value={draft.startDate}
                  invalid={Boolean(errors.startDate)}
                  describedBy={described("startDate", "plan-start")}
                  onChange={(startDate) => patch({ startDate, endDate: startDate })}
                />
                <FieldError id="plan-start-error" message={errors.startDate} />
                <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <TextField id="plan-depart" label="Time" type="time" value={draft.startTime} onChange={(startTime) => patch({ startTime })} />
                  <TextField id="plan-arrive" label="End time" type="time" value={draft.endTime} onChange={(endTime) => patch({ endTime })} />
                </div>
              </>
            ) : null}

            {draft.type === "place" ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <TextField
                  id="plan-start"
                  label="Date"
                  type="date"
                  value={draft.startDate}
                  invalid={Boolean(errors.startDate)}
                  describedBy={described("startDate", "plan-start")}
                  onChange={(startDate) => patch({ startDate, endDate: startDate })}
                />
                <TextField id="plan-time" label="Time" type="time" value={draft.startTime} onChange={(startTime) => patch({ startTime })} />
                <FieldError id="plan-start-error" message={errors.startDate} />
              </div>
            ) : null}

            {draft.type === "note" ? (
              <TextField
                id="plan-start"
                label="Date"
                type="date"
                value={draft.startDate}
                onChange={(startDate) => patch({ startDate, endDate: startDate || fallbackDate })}
              />
            ) : null}

            <DraftWeather
              place={draft.type === "flight" ? draft.toPlace : draft.wherePlace}
              date={draft.type === "flight" ? draft.endDate || draft.startDate : draft.startDate}
              units={weatherUnits}
            />
            </SmoothFields>

            <AttendeeToggles members={members} attendeeIds={attendeeIds} onChange={setAttendeeIds} />

            {draft.type !== "note" ? (
              <p className="text-xs font-medium text-foreground">Cities by Open-Meteo. Addresses © OpenStreetMap via Photon.</p>
            ) : null}

            {draft.type !== "note" ? (
              <div className="space-y-2">
                <button
                  type="button"
                  aria-expanded={showDetails}
                  aria-controls="plan-details"
                  onClick={() => setShowDetails((open) => !open)}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showDetails ? "Hide details" : "Details"}
                </button>
                {showDetails ? (
                  <div id="plan-details" className="space-y-3">
                    {!editing && currentUserName ? (
                      <p className="text-sm text-foreground">Visible to everyone on this trip</p>
                    ) : null}
                    {draft.type === "flight" && draft.mode !== "walk" ? (
                      <TextField
                        id="plan-flight-code"
                        label={draft.mode === "flight" ? "Airline or flight number" : draft.mode === "train" || draft.mode === "bus" ? "Carrier or number" : "Carrier"}
                        value={draft.flightCode}
                        placeholder={draft.mode === "flight" ? "VN 123" : draft.mode === "taxi" || draft.mode === "shuttle" ? "Grab" : "Optional"}
                        onChange={(flightCode) => patch({ flightCode })}
                      />
                    ) : null}
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-notes">Notes</Label>
                      <Textarea
                        id="plan-notes"
                        value={draft.notes}
                        placeholder="Optional details"
                        onChange={(event) => patch({ notes: event.target.value })}
                        className="min-h-24 resize-none border-border bg-background text-base"
                      />
                    </div>
                    {draft.type === "stay" ? (
                      <>
                        <TextField
                          id="plan-address"
                          label="Address or link"
                          value={draft.address}
                          placeholder="Street address or booking link"
                          invalid={Boolean(errors.address)}
                          describedBy={described("address", "plan-address")}
                          onChange={(address) => patch({ address })}
                        />
                        <FieldError id="plan-address-error" message={errors.address} />
                        <TextField
                          id="plan-confirmation"
                          label="Confirmation number"
                          value={draft.confirmation}
                          placeholder="Optional"
                          onChange={(confirmation) => patch({ confirmation })}
                        />
                      </>
                    ) : null}
                    {draft.type !== "stay" ? (
                      showLink || draft.linkUrl ? (
                        <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                          <TextField id="plan-link-label" label="Link label" value={draft.linkLabel} placeholder="Map" onChange={(linkLabel) => patch({ linkLabel })} />
                          <TextField
                            id="plan-link-url"
                            label="URL"
                            value={draft.linkUrl}
                            placeholder="https://"
                            invalid={Boolean(errors.linkUrl)}
                            describedBy={described("linkUrl", "plan-link-url")}
                            onChange={(linkUrl) => patch({ linkUrl })}
                          />
                          <FieldError id="plan-link-url-error" message={errors.linkUrl} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowLink(true)}
                          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <LinkIcon className="h-4 w-4" aria-hidden="true" />
                          Add a link
                        </button>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div data-dialog-footer="" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[max(1rem,var(--safe-bottom))]">
            {editItem ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (isDeleting || isSaving) return
                  void Promise.resolve(onDelete(editItem.id)).then(() => onOpenChange(false))
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="lg" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="rounded-full px-5" aria-busy={isSaving}>
                {isSaving ? "Saving…" : saveLabel(draft.type, editing, draft.mode)}
              </Button>
            </div>
          </div>
        </form>
        </PlacePopoverProvider>
      </DialogContent>
    </Dialog>
  )
}

function controlId(key: string): string {
  if (key === "where" || key === "from") return "plan-location"
  if (key === "to") return "plan-location-to"
  if (key === "name" || key === "customTitle") return "plan-title"
  if (key === "startDate") return "plan-start"
  if (key === "endDate") return "plan-end"
  if (key === "address") return "plan-address"
  if (key === "linkUrl") return "plan-link-url"
  return "plan-title"
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {message}
    </p>
  )
}

function TitleField({
  value,
  placeholder,
  invalid,
  describedBy,
  onChange,
}: {
  value: string
  placeholder: string
  invalid?: boolean
  describedBy?: string
  onChange: (value: string) => void
}) {
  return (
    <TextField
      id="plan-title"
      label="Title"
      value={value}
      placeholder={placeholder}
      invalid={invalid}
      describedBy={describedBy}
      onChange={onChange}
    />
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
  describedBy,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-h-11 w-full min-w-0 border-border bg-background text-base"
      />
    </div>
  )
}

function DatePair({
  startLabel,
  endLabel,
  start,
  end,
  startError,
  endError,
  onStart,
  onEnd,
}: {
  startLabel: string
  endLabel: string
  start: string
  end: string
  startError?: string
  endError?: string
  onStart: (value: string) => void
  onEnd: (value: string) => void
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
      <TextField
        id="plan-start"
        label={startLabel}
        type="date"
        value={start}
        invalid={Boolean(startError)}
        describedBy={startError ? "plan-start-error" : undefined}
        onChange={onStart}
      />
      <TextField
        id="plan-end"
        label={endLabel}
        type="date"
        value={end}
        invalid={Boolean(endError)}
        describedBy={endError ? "plan-end-error" : undefined}
        onChange={onEnd}
      />
      <FieldError id="plan-start-error" message={startError} />
      <FieldError id="plan-end-error" message={endError} />
    </div>
  )
}

function TimeZoneField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-h-11 w-full min-w-0 rounded-md border border-foreground bg-background px-3 text-base text-foreground"
      >
        <option value="">Choose a time zone</option>
        {value && !TIME_ZONE_CHOICES.some(([zone]) => zone === value) ? <option value={value}>{timeZoneLabel(value)}</option> : null}
        {TIME_ZONE_CHOICES.map(([zone, name]) => (
          <option key={zone} value={zone}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}

function FlightClock({
  draft,
  showZones,
  onShowZones,
  onDepartZone,
  onArriveZone,
}: {
  draft: PlanDraft
  showZones: boolean
  onShowZones: () => void
  onDepartZone: (value: string) => void
  onArriveZone: (value: string) => void
}) {
  const idle = !draft.startTime && !draft.endTime
  const summary = flightWhen({
    departTime: draft.startTime,
    arriveTime: draft.endTime,
    departDate: draft.startDate,
    arriveDate: draft.endDate,
    departZone: draft.startZone || draft.fromPlace?.timeZone || airportTimeZone(draft.from) || "",
    arriveZone: draft.endZone || draft.toPlace?.timeZone || airportTimeZone(draft.to) || "",
    departCity: placeCity(draft.fromPlace, draft.from),
    arriveCity: placeCity(draft.toPlace, draft.to),
  })
  return (
    <div className="space-y-1">
      <p className="text-sm text-foreground" data-testid="flight-when">
        {idle ? "Times are optional. For an overnight flight, set Arrive to the day you land." : summary}
      </p>
      {idle || showZones ? null : (
        <button
          type="button"
          onClick={onShowZones}
          className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Change
        </button>
      )}
      {showZones ? (
        <>
          <TimeZoneField id="plan-depart-zone" label="Departing time zone" value={draft.startZone} onChange={onDepartZone} />
          <TimeZoneField id="plan-arrive-zone" label="Arriving time zone" value={draft.endZone} onChange={onArriveZone} />
        </>
      ) : null}
    </div>
  )
}

function placeCity(place: GeoPlace | null | undefined, text: string): string {
  if (place?.city?.trim()) return place.city.trim()
  const trimmed = text.trim()
  if (trimmed && trimmed.length <= 22 && !trimmed.includes("·")) return trimmed
  return ""
}

function placeStillMatches(text: string, place: GeoPlace | null | undefined): GeoPlace | null {
  if (!place) return null
  const value = text.trim()
  if (value === place.name.trim() || (place.label && value === place.label.trim())) return place
  return null
}

function ModePicker({ mode, onChange }: { mode: TravelMode; onChange: (mode: TravelMode) => void }) {
  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TRAVEL_MODES.findIndex((entry) => entry.id === mode)
    let next = index
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % TRAVEL_MODES.length
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + TRAVEL_MODES.length) % TRAVEL_MODES.length
    else return
    event.preventDefault()
    const picked = TRAVEL_MODES[next]
    if (!picked) return
    onChange(picked.id)
    document.getElementById(`plan-mode-${picked.id}`)?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Travel mode" className="flex flex-wrap gap-1.5">
      {TRAVEL_MODES.map((entry) => {
        const selected = mode === entry.id
        const Icon = travelIcon(entry.id)
        return (
          <button
            key={entry.id}
            id={`plan-mode-${entry.id}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.picker}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(entry.id)}
            onKeyDown={onKey}
            className={`inline-flex min-h-11 min-w-[5.25rem] flex-1 basis-[30%] items-center justify-center gap-1.5 rounded-md border border-foreground px-1.5 text-center text-sm font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "bg-foreground text-background" : "bg-background text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{entry.id === "taxi" ? "Taxi" : entry.picker}</span>
          </button>
        )
      })}
    </div>
  )
}

function SmoothFields({ watch, children }: { watch: string; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [motion, setMotion] = useState(true)
  const [clip, setClip] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setMotion(!media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useLayoutEffect(() => {
    const node = innerRef.current
    if (!node) return
    const measure = () => {
      const next = node.scrollHeight
      setHeight((current) => (current === next ? current : next))
    }
    const frame = window.requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [watch])

  useEffect(() => {
    if (!motion) return
    setClip(true)
    const timer = window.setTimeout(() => setClip(false), 160)
    return () => window.clearTimeout(timer)
  }, [motion, watch])

  return (
    <div
      className="min-w-0"
      style={
        motion && height != null
          ? {
              height,
              minHeight: height,
              flexShrink: 0,
              transition: "height 150ms ease-out",
              overflow: clip ? "hidden" : "visible",
            }
          : { flexShrink: 0 }
      }
    >
      <div ref={innerRef} className="flex flex-col gap-2 py-0.5">
        {children}
      </div>
    </div>
  )
}
