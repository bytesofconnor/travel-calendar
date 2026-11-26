"use client"

import { useEffect, useRef } from "react"

import { nightLabel, type GlanceNight } from "@/lib/trip-glance"

export function TripNights({
  nights,
  today,
  onSelect,
}: {
  nights: readonly GlanceNight[]
  today: string
  onSelect: (date: string) => void
}) {
  const trackRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const current = track?.querySelector("[aria-current='date']")
    if (!track || !(current instanceof HTMLElement)) return
    const left = current.offsetLeft - (track.clientWidth - current.offsetWidth) / 2
    track.scrollLeft = Math.max(0, left)
  }, [nights, today])

  if (nights.length === 0) return null
  return (
    <section className="trip-nights trip-list__nights" aria-labelledby="trip-nights-title">
      <h2 id="trip-nights-title" className="trip-nights__title">
        Nights
      </h2>
      <ul ref={trackRef} className="trip-nights__track">
        {nights.map((night) => (
          <li key={night.date}>
            <button
              type="button"
              className="trip-nights__night"
              aria-current={night.date === today ? "date" : undefined}
              aria-label={nightLabel(night, today)}
              data-booked={night.booked ? "true" : "false"}
              data-city-change={night.cityChange ? "true" : "false"}
              onClick={() => onSelect(night.date)}
            >
              <span className="trip-nights__index">Night {night.index} of {night.count}</span>
              {night.city ? <span className="trip-nights__city"> {night.city}</span> : null}
              <span className="trip-nights__stay"> {night.booked ? night.stayTitle : "No stay booked"}</span>
              {night.cityChange ? <span className="trip-nights__flag"> New city</span> : null}
              {night.date === today ? <span className="trip-nights__flag"> Today</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
