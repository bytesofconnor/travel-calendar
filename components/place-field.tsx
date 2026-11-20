"use client"

import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GeoPlace, PlaceFeature } from "@/lib/plan-types"

type PopoverControl = {
  id: string | null
  setId: (id: string | null) => void
}

const PopoverContext = createContext<PopoverControl | null>(null)

export function PlacePopoverProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  const value = useMemo(() => ({ id, setId }), [id])
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
}

function usePopover(): PopoverControl {
  return useContext(PopoverContext) ?? { id: null, setId: () => {} }
}

export function PlaceField({
  id,
  label,
  value,
  placeholder,
  flight = false,
  invalid = false,
  describedBy,
  bias = "",
  selected = null,
  onText,
  onPlace,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  flight?: boolean
  invalid?: boolean
  describedBy?: string
  bias?: string
  selected?: GeoPlace | null
  onText: (value: string) => void
  onPlace: (place: GeoPlace) => void
}) {
  const listId = useId()
  const popover = usePopover()
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [places, setPlaces] = useState<GeoPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [settled, setSettled] = useState("")
  const [active, setActive] = useState(0)
  const [announce, setAnnounce] = useState("")
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number; lift: boolean } | null>(null)
  const [dialog, setDialog] = useState<HTMLElement | null>(null)
  const open = popover.id === id
  const query = value.trim()
  const chosen = selected && query === (selected.label || selected.name) ? selected : null
  const fullName = chosen?.name && chosen.name !== query ? chosen.name : ""

  useEffect(() => {
    if (query.length < 2) {
      setLoading(false)
      setSettled("")
      setPlaces([])
      return
    }
    const timer = window.setTimeout(() => {
      const url = `/api/places?q=${encodeURIComponent(query)}&kind=${flight ? "flight" : "place"}&bias=${encodeURIComponent(bias)}`
      setLoading(true)
      void fetch(url)
        .then((response) => response.json())
        .then((body: { places?: GeoPlace[] }) => {
          const next = Array.isArray(body.places) ? body.places.filter((place) => place.name?.trim()) : []
          setPlaces(next)
          setActive(0)
          setSettled(query)
          setAnnounce(next.length === 0 ? "No suggestions" : next.length === 1 ? "1 suggestion" : `${next.length} suggestions`)
        })
        .catch(() => {
          setSettled(query)
          setAnnounce("No suggestions")
        })
        .finally(() => setLoading(false))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [bias, flight, query])

  const showList = open && query.length >= 2 && (places.length > 0 || loading || settled === query)

  useLayoutEffect(() => {
    const node = inputRef.current?.closest("[data-slot=dialog-content]")
    setDialog(node instanceof HTMLElement ? node : null)
  }, [])

  useLayoutEffect(() => {
    if (!showList) return
    const input = inputRef.current
    if (!input) return
    function place() {
      const anchor = inputRef.current
      const dialog = anchor?.closest("[data-slot=dialog-content]")
      if (!anchor || !(dialog instanceof HTMLElement)) return
      const dialogRect = dialog.getBoundingClientRect()
      const rect = anchor.getBoundingClientRect()
      const footer = dialog.querySelector("[data-dialog-footer]")
      const footerTop = footer instanceof HTMLElement ? footer.getBoundingClientRect().top : dialogRect.bottom
      const limitBottom = Math.min(dialogRect.bottom, footerTop)
      const gap = 4
      const edgeTop = dialogRect.top + dialog.clientTop
      const edgeLeft = dialogRect.left + dialog.clientLeft
      const visibleTop = Math.min(Math.max(rect.top, dialogRect.top), limitBottom - gap)
      const visibleBottom = Math.min(Math.max(rect.bottom, dialogRect.top + gap), limitBottom)
      const aboveFooter = limitBottom - visibleBottom - gap
      const above = visibleTop - dialogRect.top - gap
      const dialogBelow = dialogRect.bottom - visibleBottom - gap
      const lift = aboveFooter < 120 && above > aboveFooter && above >= 88
      const maxHeight = lift
        ? Math.min(320, above - 8)
        : Math.min(320, Math.max(aboveFooter, dialogBelow) - 8)
      const width = Math.min(Math.max(rect.width, 320), dialogRect.width - 16)
      const rawLeft = rect.left - edgeLeft
      const maxLeft = Math.max(8, dialogRect.width - width - 8)
      setBox({
        top: (lift ? visibleTop : visibleBottom) - edgeTop,
        left: Math.max(8, Math.min(rawLeft, maxLeft)),
        width,
        maxHeight: Math.max(72, maxHeight),
        lift,
      })
    }
    place()
    const scroller = input.closest(".overflow-y-auto")
    scroller?.addEventListener("scroll", place, { passive: true })
    window.addEventListener("resize", place)
    return () => {
      scroller?.removeEventListener("scroll", place)
      window.removeEventListener("resize", place)
    }
  }, [showList, places.length, loading])

  useEffect(() => {
    if (!open) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      popover.setId(null)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, popover.setId])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      if (popover.id === id) popover.setId(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [id, open, popover])

  function reveal() {
    if (query.length >= 2) popover.setId(id)
  }

  function close() {
    if (popover.id === id) popover.setId(null)
  }

  function pick(place: GeoPlace) {
    onPlace(place)
    close()
  }

  function move(next: number) {
    if (places.length === 0) return
    const index = (next + places.length) % places.length
    setActive(index)
    document.getElementById(`${listId}-option-${index}`)?.scrollIntoView({ block: "nearest" })
  }

  const list =
    showList && box && dialog instanceof HTMLElement
      ? createPortal(
          <div
            ref={listRef}
            className="place-popover fixed z-[60] overflow-hidden rounded-md border border-foreground bg-background text-foreground shadow-none"
            style={{
              top: box.lift ? box.top - 4 : box.top + 4,
              left: box.left,
              width: box.width,
              zIndex: 70,
              transform: box.lift ? "translateY(-100%)" : undefined,
            }}
          >
            <ul id={listId} role="listbox" aria-label={`${label} suggestions`} tabIndex={-1} className="overflow-y-auto py-1" style={{ maxHeight: box.maxHeight }}>
              {places.map((place, index) => (
                <li
                  key={`${place.kind ?? "place"}-${place.code ?? place.label ?? place.name}-${place.country ?? index}`}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-kind={place.kind ?? "city"}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 text-left text-base text-foreground ${
                    index === active ? "place-option-active" : "bg-background"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(place)
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  <PlaceIcon kind={place.kind} />
                  <span className="sr-only">{kindLabel(place.kind)}</span>
                  <span className="min-w-0">
                    <span className="block font-medium leading-snug">{place.label || place.name}</span>
                    {place.detail ? <span className="block text-sm text-foreground">{place.detail}</span> : null}
                  </span>
                </li>
              ))}
              {places.length === 0 && loading ? <li className="px-3 py-2 text-sm text-foreground">Searching…</li> : null}
              {places.length === 0 && !loading && settled === query ? <li className="px-3 py-2 text-sm text-foreground">No matches</li> : null}
            </ul>
          </div>,
          dialog,
        )
      : null

  return (
    <div ref={rootRef} className="relative min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showList && places[active] ? `${listId}-option-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-label={fullName ? `${label}, ${query}, ${fullName}` : undefined}
        title={fullName || undefined}
        aria-describedby={[describedBy, invalid ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 min-h-11 w-full border-border bg-background text-base"
        onChange={(event) => {
          onText(event.target.value)
          const next = event.target.value.trim()
          if (next.length >= 2) popover.setId(id)
          else if (popover.id === id) popover.setId(null)
        }}
        onFocus={reveal}
        onBlur={() => {
          window.setTimeout(() => {
            const next = document.activeElement
            if (listRef.current?.contains(next)) return
            close()
          }, 120)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            reveal()
            move(open ? active + 1 : 0)
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            reveal()
            move(active - 1)
          } else if (event.key === "Home") {
            event.preventDefault()
            move(0)
          } else if (event.key === "End") {
            event.preventDefault()
            move(places.length - 1)
          } else if (event.key === "Enter" && showList) {
            event.preventDefault()
            const place = places[active]
            if (place) pick(place)
          } else if (event.key === "Escape" && open) {
            event.preventDefault()
            event.stopPropagation()
            close()
          }
        }}
      />
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
      {list}
    </div>
  )
}

function kindLabel(kind?: PlaceFeature): string {
  if (kind === "airport") return "Airport"
  if (kind === "address") return "Address"
  if (kind === "country") return "Country"
  if (kind === "region") return "Region"
  return "City"
}

function PlaceIcon({ kind }: { kind?: PlaceFeature }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
      {kind === "airport" ? (
        <path d="M10 19 3 21l1.5-4L12 4l2 7 6 2-8 2Z" />
      ) : kind === "address" ? (
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      ) : kind === "country" || kind === "region" ? (
        <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm0 0h16M12 4c2 2.4 2 13.6 0 16M12 4c-2 2.4-2 13.6 0 16" />
      ) : (
        <path d="M4 20V9l8-5 8 5v11H4Z" />
      )}
    </svg>
  )
}
