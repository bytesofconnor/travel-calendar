"use client"

import { useEffect, useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GeoPlace } from "@/lib/plan-types"

export function PlaceField({
  id,
  label,
  value,
  placeholder,
  flight = false,
  invalid = false,
  describedBy,
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
  onText: (value: string) => void
  onPlace: (place: GeoPlace) => void
}) {
  const listId = useId()
  const [places, setPlaces] = useState<GeoPlace[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const errorId = `${id}-error`

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) {
      setPlaces([])
      setOpen(false)
      return
    }
    const timer = window.setTimeout(() => {
      const url = `/api/places?q=${encodeURIComponent(query)}&kind=${flight ? "flight" : "place"}`
      void fetch(url)
        .then((response) => response.json())
        .then((body: { places?: GeoPlace[] }) => {
          const next = Array.isArray(body.places) ? body.places : []
          setPlaces(next)
          setActive(0)
          setOpen(next.length > 0)
        })
        .catch(() => {
          setPlaces([])
          setOpen(false)
        })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [flight, value])

  function pick(place: GeoPlace) {
    onPlace(place)
    setOpen(false)
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedBy, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
        autoComplete="off"
        className="h-11 min-h-11 border-border bg-background text-base"
        onChange={(event) => onText(event.target.value)}
        onFocus={() => {
          if (places.length > 0) setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(index + 1, Math.max(places.length - 1, 0)))
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          } else if (event.key === "Enter" && open && places[active]) {
            event.preventDefault()
            pick(places[active])
          } else if (event.key === "Escape" && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          }
        }}
      />
      {open ? (
        <div className="rounded-md border border-foreground bg-background">
          <ul id={listId} role="listbox" aria-label={label} className="max-h-60 overflow-y-auto py-1">
            {places.map((place, index) => (
              <li key={`${place.name}-${place.lat ?? index}`} role="presentation">
                <button
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`flex min-h-11 w-full items-center px-3 text-left text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    index === active ? "bg-foreground text-background" : "bg-background"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(place)
                  }}
                >
                  {place.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-foreground px-3 py-2 text-sm text-foreground">
            Cities by Open-Meteo. Addresses © OpenStreetMap via Photon.
          </p>
        </div>
      ) : null}
    </div>
  )
}
