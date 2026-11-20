"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"

import type { TripItem } from "@/lib/kanban-store"
import { inferPlanKind, kindLabel, type PlanKind } from "@/lib/trip-kind"
import { cn } from "@/lib/utils"
import { DayWeather, type DayWeatherState } from "@/components/weather-chip"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const KIND_ORDER: Record<PlanKind, number> = {
  flight: 0,
  stay: 1,
  place: 2,
  note: 3,
  ask: 4,
  now: 5,
}

const WIDE_CHIP_CAP = 2
const NARROW_DOT_CAP = 3

interface TripMonthViewProps {
  items: TripItem[]
  tripStart: string
  tripEnd: string
  today: string
  onEditItem: (item: TripItem) => void
  onAddItem: (date: string) => void
  weather?: DayWeatherState
  className?: string
}

function monthKey(isoDate: string) {
  return /^\d{4}-\d{2}/.test(isoDate) ? isoDate.slice(0, 7) : ""
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthTitle(key: string) {
  const [year, month] = key.split("-").map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function buildDays(key: string) {
  const [year, month] = key.split("-").map(Number)
  const first = new Date(year, month - 1, 1)
  const start = new Date(year, month - 1, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { iso: localIso(date), inMonth: date.getMonth() === month - 1 }
  })
}

function dateParts(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  return {
    weekday: WEEKDAYS[date.getDay()],
    month: MONTHS[date.getMonth()],
    day: date.getDate(),
  }
}

function eventPhrase(item: TripItem) {
  const kind = inferPlanKind(item)
  if (kind === "flight") {
    const from = item.location.trim()
    const to = item.locationTo?.trim()
    return to ? `Flight ${from} to ${to}` : `Flight ${item.title}`
  }
  if (kind === "stay") return `Stay ${item.title}`
  return `${kindLabel(kind)} ${item.title}`
}

function itemsOnDay(items: TripItem[], iso: string) {
  return items
    .filter((item) => item.startDate <= iso && item.endDate >= iso)
    .sort((left, right) => {
      const kind = KIND_ORDER[inferPlanKind(left)] - KIND_ORDER[inferPlanKind(right)]
      if (kind !== 0) return kind
      return left.title.localeCompare(right.title)
    })
}

function dayName(iso: string, dayItems: TripItem[], isToday: boolean) {
  const { weekday, month, day } = dateParts(iso)
  const head = `${weekday} ${month} ${day}`
  const when = isToday ? `${head}, today` : head
  if (dayItems.length === 0) return `${when}, no events`
  const noun = dayItems.length === 1 ? "event" : "events"
  return `${when}, ${dayItems.length} ${noun}: ${dayItems.map(eventPhrase).join(", ")}`
}

function focusIndexFor(days: Array<{ iso: string; inMonth: boolean }>, today: string) {
  const todayIndex = days.findIndex((day) => day.inMonth && day.iso === today)
  if (todayIndex >= 0) return todayIndex
  const first = days.findIndex((day) => day.inMonth)
  return first >= 0 ? first : 0
}

export function TripMonthView({
  items,
  tripStart,
  tripEnd,
  today,
  onEditItem,
  onAddItem,
  weather,
  className,
}: TripMonthViewProps) {
  const initialMonth = monthKey(tripStart) || monthKey(today)
  const [month, setMonth] = useState(initialMonth)
  const days = useMemo(() => buildDays(month), [month])
  const [focusIndex, setFocusIndex] = useState(() => focusIndexFor(buildDays(initialMonth), today))
  const [selected, setSelected] = useState<string | null>(null)
  const moveFocus = useRef(false)
  const focusRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    focusRef.current?.focus()
  }, [focusIndex])

  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta)
    setMonth(next)
    setFocusIndex(focusIndexFor(buildDays(next), today))
    setSelected(null)
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 7 : event.key === "ArrowUp" ? -7 : 0
    if (!delta) return
    event.preventDefault()
    const next = index + delta
    if (next < 0 || next >= days.length) return
    moveFocus.current = true
    setFocusIndex(next)
  }

  const selectedItems = selected ? itemsOnDay(items, selected) : []
  const selectedParts = selected ? dateParts(selected) : null

  return (
    <section className={cn("month-view", className)} data-month-view>
      <div className="month-nav">
        <button type="button" className="month-nav__btn" aria-label="Previous month" onClick={() => changeMonth(-1)}>
          <span aria-hidden="true">‹</span>
        </button>
        <h2 className="month-nav__title">{monthTitle(month)}</h2>
        <button type="button" className="month-nav__btn" aria-label="Next month" onClick={() => changeMonth(1)}>
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div role="grid" aria-label={monthTitle(month)} className="month-grid">
        <div role="row" className="month-grid__row">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} role="columnheader" aria-label={weekday} className="month-dow">
              <span className="month-dow__long">{weekday.slice(0, 3)}</span>
              <span className="month-dow__short">{weekday.slice(0, 1)}</span>
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className="month-grid__row">
            {days.slice(week * 7, week * 7 + 7).map((day, column) => {
              const index = week * 7 + column
              const dayItems = itemsOnDay(items, day.iso)
              const inTrip = day.iso >= tripStart && day.iso <= tripEnd
              const isToday = day.iso === today
              const wideMore = Math.max(0, dayItems.length - WIDE_CHIP_CAP)
              const narrowMore = Math.max(0, dayItems.length - NARROW_DOT_CAP)
              return (
                <button
                  key={day.iso}
                  type="button"
                  role="gridcell"
                  ref={index === focusIndex ? focusRef : undefined}
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-selected={selected === day.iso}
                  aria-current={isToday ? "date" : undefined}
                  data-trip={inTrip ? "true" : "false"}
                  data-outside={day.inMonth ? "false" : "true"}
                  data-today={isToday ? "true" : "false"}
                  className="month-day"
                  onClick={() => {
                    setFocusIndex(index)
                    setSelected(day.iso)
                  }}
                  onKeyDown={(event) => onDayKeyDown(event, index)}
                >
                  <span className="sr-only">{dayName(day.iso, dayItems, isToday)}</span>
                  <span className="month-day__num">{dateParts(day.iso).day}</span>
                  {dayItems.length > 0 ? (
                    <>
                      <span className="month-day__chips" aria-hidden="true">
                        {dayItems.slice(0, WIDE_CHIP_CAP).map((item) => (
                          <span key={item.id} className="month-chip" data-kind={inferPlanKind(item)}>
                            {item.title}
                          </span>
                        ))}
                      </span>
                      <span className="month-day__dots" aria-hidden="true">
                        {dayItems.slice(0, NARROW_DOT_CAP).map((item) => (
                          <span key={item.id} className="month-dot" data-kind={inferPlanKind(item)} />
                        ))}
                      </span>
                      {wideMore > 0 ? <span className="month-more month-more--wide">+{wideMore} more</span> : null}
                      {narrowMore > 0 ? <span className="month-more month-more--narrow">+{narrowMore} more</span> : null}
                    </>
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selected && selectedParts ? (
        <div className="month-detail">
          <h3 className="month-detail__title">
            {selectedParts.weekday}, {selectedParts.month} {selectedParts.day}
          </h3>
          {weather ? (
            <DayWeather date={selected} readings={weather.readings} units={weather.units} showScale choose={weather.choose} />
          ) : null}
          {selectedItems.length > 0 ? (
            <ul className="month-detail__list">
              {selectedItems.map((item) => {
                const kind = inferPlanKind(item)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`plan-card plan-card--${kind}`}
                      onClick={() => onEditItem(item)}
                    >
                      <span className="plan-card__rail" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="plan-card__kind">{kindLabel(kind)}</span>
                        <span className="plan-card__title">{item.title}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          <button type="button" className="month-add" onClick={() => onAddItem(selected)}>
            Add something
          </button>
        </div>
      ) : null}
    </section>
  )
}
