"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { PlanWhen } from "@/components/plan-when"
import type { TripItem } from "@/lib/kanban-store"
import { itemsOnDay, stayBarsForWeek, tripEdges, type MonthDayCell } from "@/lib/month-layout"
import { describePlanWhen } from "@/lib/plan-when"
import { inferPlanKind, shownLabel, shownMode, type PlanKind } from "@/lib/trip-kind"
import { TravelMark } from "@/components/travel-mark"
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

function revealDayPanel(panel: HTMLElement) {
  const scroller = panel.closest("[data-trip-scroll]")
  if (!(scroller instanceof HTMLElement)) {
    panel.scrollIntoView({ block: "start" })
    return
  }
  const toolbar = scroller.querySelector("[data-trip-toolbar]")
  const sticky =
    toolbar instanceof HTMLElement && getComputedStyle(toolbar).position === "sticky"
      ? toolbar.getBoundingClientRect().height
      : 0
  const scrollerRect = scroller.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const visibleTop = scrollerRect.top + sticky + 12
  const visibleBottom = scrollerRect.bottom - 12
  if (panelRect.top >= visibleTop - 1 && panelRect.bottom <= visibleBottom + 1) return
  scroller.scrollTo({ top: scroller.scrollTop + panelRect.top - visibleTop, behavior: "auto" })
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

function buildDays(key: string): MonthDayCell[] {
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
  const label = shownLabel(item)
  const kind = inferPlanKind(item)
  if (kind === "flight" || shownMode(item)) {
    const from = item.location.trim()
    const to = item.locationTo?.trim()
    return to ? `${label} ${from} to ${to}` : `${label} ${item.title}`
  }
  if (kind === "stay") return `Stay ${item.title}`
  return `${label} ${item.title}`
}

const word = "\u200B"

function planAccessibleName(label: string, title: string, described: { label: string; parts: { text: string }[] }) {
  const raw = `${label}${word}${title}${word}${described.parts.map((part) => `${part.text}${word}`).join("")}`
  return `${raw}. ${label} ${title}. ${described.label}`
}

function KindMark({ item }: { item: TripItem }) {
  const label = shownLabel(item)
  const mode = shownMode(item)
  if (!mode) return <>{label}</>
  return <TravelMark mode={mode} label={label} />
}

function dayName(iso: string, dayItems: TripItem[], isToday: boolean, inTrip: boolean) {
  const { weekday, month, day } = dateParts(iso)
  const head = isToday ? `${weekday} ${month} ${day}, today` : `${weekday} ${month} ${day}`
  const trip = inTrip ? ", on the trip" : ""
  if (dayItems.length === 0) return `${head}, no events${trip}`
  const noun = dayItems.length === 1 ? "event" : "events"
  return `${head}, ${dayItems.length} ${noun}: ${dayItems.map(eventPhrase).join(", ")}${trip}`
}

function focusIndexFor(days: MonthDayCell[], today: string) {
  const todayIndex = days.findIndex((day) => day.inMonth && day.iso === today)
  if (todayIndex >= 0) return todayIndex
  const first = days.findIndex((day) => day.inMonth)
  return first >= 0 ? first : 0
}

function indexForDayNumber(days: MonthDayCell[], iso: string) {
  const dayNumber = iso.slice(8, 10)
  const match = days.findIndex((day) => day.inMonth && day.iso.slice(8, 10) === dayNumber)
  if (match >= 0) return match
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].inMonth) return index
  }
  return 0
}

function indexForIso(days: MonthDayCell[], iso: string) {
  const match = days.findIndex((day) => day.iso === iso)
  return match >= 0 ? match : focusIndexFor(days, iso)
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
  const detailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    focusRef.current?.focus()
  }, [focusIndex, month])

  useEffect(() => {
    const panel = detailRef.current
    if (!selected || !panel) return
    revealDayPanel(panel)
    panel.focus({ preventScroll: true })
  }, [selected])

  function showMonth(nextMonth: string, nextIndex: number, focus: boolean) {
    moveFocus.current = focus
    setMonth(nextMonth)
    setFocusIndex(nextIndex)
    setSelected(null)
  }

  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta)
    showMonth(next, focusIndexFor(buildDays(next), today), false)
  }

  function jumpTo(iso: string) {
    const nextMonth = monthKey(iso)
    const built = buildDays(nextMonth)
    setMonth(nextMonth)
    setFocusIndex(indexForIso(built, iso))
    setSelected(iso)
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const key = event.key
    if ((event.ctrlKey || event.metaKey) && (key === "Home" || key === "End")) {
      event.preventDefault()
      if (key === "Home") {
        const first = days.findIndex((day) => day.inMonth)
        moveFocus.current = true
        setFocusIndex(first >= 0 ? first : 0)
        return
      }
      let last = 0
      days.forEach((day, dayIndex) => {
        if (day.inMonth) last = dayIndex
      })
      moveFocus.current = true
      setFocusIndex(last)
      return
    }
    if (key === "Home" || key === "End") {
      event.preventDefault()
      const weekStart = Math.floor(index / 7) * 7
      moveFocus.current = true
      setFocusIndex(key === "Home" ? weekStart : weekStart + 6)
      return
    }
    if (key === "PageUp" || key === "PageDown") {
      event.preventDefault()
      const nextMonth = shiftMonth(month, key === "PageUp" ? -1 : 1)
      const current = days[index]?.iso ?? today
      showMonth(nextMonth, indexForDayNumber(buildDays(nextMonth), current), true)
      return
    }
    const delta =
      key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : key === "ArrowDown" ? 7 : key === "ArrowUp" ? -7 : 0
    if (!delta) return
    event.preventDefault()
    const next = index + delta
    if (next < 0 || next >= days.length) return
    moveFocus.current = true
    setFocusIndex(next)
  }

  const selectedItems = selected ? itemsOnDay(items, selected) : []
  const selectedParts = selected ? dateParts(selected) : null
  const tripMonth = monthKey(tripStart)
  const todayMonth = monthKey(today)
  const showTripStart = month !== tripMonth && tripMonth !== todayMonth
  const showToday = month !== todayMonth

  return (
    <section className={cn("month-view", className)} data-month-view>
      <div className="month-nav">
        <div className="month-nav__cluster">
          <button type="button" className="month-nav__btn" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <h2 className="month-nav__title" id="month-view-title">
            {monthTitle(month)}
          </h2>
          <button type="button" className="month-nav__btn" aria-label="Next month" onClick={() => changeMonth(1)}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <div className="month-nav__jumps">
          {showTripStart ? (
            <button type="button" className="month-nav__jump" onClick={() => jumpTo(tripStart)}>
              Trip start
            </button>
          ) : null}
          {showToday ? (
            <button type="button" className="month-nav__jump" onClick={() => jumpTo(today)}>
              Today
            </button>
          ) : null}
        </div>
      </div>

      <div className="month-scale">
        <div className="month-body">
          <div role="grid" aria-labelledby="month-view-title" className="month-grid">
            <div role="row" className="month-dow-row">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} role="columnheader" aria-label={weekday} className="month-dow">
                  <span className="month-dow__long">{weekday.slice(0, 3)}</span>
                  <span className="month-dow__short">{weekday.slice(0, 1)}</span>
                </div>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => {
              const weekDays = days.slice(week * 7, week * 7 + 7)
              const bars = stayBarsForWeek(weekDays, items)
              return (
                <div key={weekDays[0]?.iso ?? week} role="row" className="month-week">
                  {weekDays.map((day, column) => {
                    const index = week * 7 + column
                    const dayItems = itemsOnDay(items, day.iso)
                    const edges = tripEdges(days, index, tripStart, tripEnd)
                    const isToday = day.iso === today
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        role="gridcell"
                        ref={index === focusIndex ? focusRef : undefined}
                        tabIndex={index === focusIndex ? 0 : -1}
                        aria-selected={selected === day.iso}
                        aria-current={isToday ? "date" : undefined}
                        data-trip={edges.inTrip ? "true" : "false"}
                        data-outside={day.inMonth ? "false" : "true"}
                        data-today={isToday ? "true" : "false"}
                        className="month-day"
                        style={{ gridColumn: column + 1 }}
                        onClick={() => {
                          setFocusIndex(index)
                          setSelected(day.iso)
                        }}
                        onKeyDown={(event) => onDayKeyDown(event, index)}
                      >
                        <span className="sr-only">{dayName(day.iso, dayItems, isToday, edges.inTrip)}</span>
                      </button>
                    )
                  })}
                  <div className="month-face" aria-hidden="true">
                    {weekDays.map((day, column) => {
                      const index = week * 7 + column
                      const edges = tripEdges(days, index, tripStart, tripEnd)
                      return (
                        <span
                          key={`bg-${day.iso}`}
                          className="month-bg"
                          data-trip={edges.inTrip ? "true" : "false"}
                          data-outside={day.inMonth ? "false" : "true"}
                          data-edge={edges.edges || undefined}
                          data-join-left={edges.joinLeft ? "true" : "false"}
                          data-join-top={edges.joinTop ? "true" : "false"}
                          data-column={column}
                          style={{ gridColumn: column + 1 }}
                        />
                      )
                    })}
                    {weekDays.map((day, column) => {
                      const dayItems = itemsOnDay(items, day.iso)
                      const isToday = day.iso === today
                      return (
                        <span
                          key={`num-${day.iso}`}
                          className="month-day__num"
                          data-outside={day.inMonth ? "false" : "true"}
                          style={{ gridColumn: column + 1 }}
                        >
                          <span className="month-day__date" data-today={isToday ? "true" : "false"}>
                            {dateParts(day.iso).day}
                          </span>
                          {isToday ? <span className="month-day__today">Today</span> : null}
                          {dayItems.length > 0 ? <span className="month-badge">{dayItems.length}</span> : null}
                        </span>
                      )
                    })}
                    <div className="month-bars">
                      {bars.map((bar) => (
                        <span
                          key={`${bar.id}-${bar.start}`}
                          className="month-bar"
                          data-kind={bar.kind}
                          data-continues-before={bar.continuesBefore ? "true" : "false"}
                          data-continues-after={bar.continuesAfter ? "true" : "false"}
                          style={{ gridColumn: `${bar.start + 1} / ${bar.end + 2}`, gridRow: bar.lane + 1 }}
                        >
                          {bar.continuesBefore ? null : <span className="month-bar__kind">Stay</span>}
                          <span className="month-bar__title">{bar.title}</span>
                        </span>
                      ))}
                    </div>
                    {weekDays.map((day, column) => {
                      const singles = itemsOnDay(items, day.iso).filter((item) => inferPlanKind(item) !== "stay")
                      return (
                        <span key={`chips-${day.iso}`} className="month-day__chips" style={{ gridColumn: column + 1 }}>
                          {singles.map((item) => {
                            const kind = inferPlanKind(item)
                            return (
                              <span key={item.id} className="month-chip" data-kind={kind}>
                                <span className="month-chip__kind"><KindMark item={item} /></span>
                                <span className="month-chip__title">{item.title}</span>
                              </span>
                            )
                          })}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {selected && selectedParts ? (
            <div
              ref={detailRef}
              className="month-detail"
              tabIndex={-1}
              role="region"
              aria-labelledby="month-detail-title"
            >
              <div className="month-detail__body">
                <h3 className="month-detail__title" id="month-detail-title">
                  {selectedParts.weekday}, {selectedParts.month} {selectedParts.day}
                </h3>
                {weather ? (
                  <DayWeather date={selected} readings={weather.readings} units={weather.units} />
                ) : null}
                {selectedItems.length > 0 ? (
                  <ul className="month-detail__list">
                  {selectedItems.map((item) => {
                    const kind = inferPlanKind(item)
                    const described = describePlanWhen(item, selected, selectedItems)
                    const label = shownLabel(item)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`plan-card plan-card--${kind}`}
                          aria-label={planAccessibleName(label, item.title, described)}
                          onClick={() => onEditItem(item)}
                        >
                          <span className="plan-card__rail" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="plan-card__kind"><KindMark item={item} /></span>
                            {word}
                            <span className="plan-card__title">{item.title}</span>
                            {word}
                            <PlanWhen item={item} day={selected} dayItems={selectedItems} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  </ul>
                ) : (
                  <p className="month-detail__empty">Nothing on this day yet.</p>
                )}
              </div>
              <button type="button" className="month-add" onClick={() => onAddItem(selected)}>
                Add something
              </button>
            </div>
          ) : null}
        </div>

        <MonthAgenda
          days={days}
          items={items}
          tripStart={tripStart}
          tripEnd={tripEnd}
          today={today}
          weather={weather}
          onEditItem={onEditItem}
          onAddItem={onAddItem}
        />
      </div>
    </section>
  )
}

function MonthAgenda({
  days,
  items,
  tripStart,
  tripEnd,
  today,
  weather,
  onEditItem,
  onAddItem,
}: {
  days: MonthDayCell[]
  items: TripItem[]
  tripStart: string
  tripEnd: string
  today: string
  weather?: DayWeatherState
  onEditItem: (item: TripItem) => void
  onAddItem: (date: string) => void
}) {
  const weeks = Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7))
  return (
    <div className="month-agenda">
      {weeks.map((weekDays) => {
        const visible = weekDays.filter((day) => day.inMonth)
        if (visible.length === 0) return null
        const start = dateParts(visible[0].iso)
        return (
          <section key={weekDays[0].iso} className="month-agenda__week">
            <h3 className="month-agenda__week-title">
              Week of {start.month} {start.day}
            </h3>
            {visible.map((day) => {
              const parts = dateParts(day.iso)
              const dayItems = itemsOnDay(items, day.iso)
              const inTrip = day.iso >= tripStart && day.iso <= tripEnd
              const label = `${parts.weekday} ${parts.month} ${parts.day}`
              return (
                <article key={day.iso} className="month-agenda__day" data-trip={inTrip ? "true" : "false"} data-today={day.iso === today ? "true" : "false"}>
                  <h4 className="month-agenda__date">{label}</h4>
                  {weather ? (
                    <DayWeather date={day.iso} readings={weather.readings} units={weather.units} />
                  ) : null}
                  {dayItems.length > 0 ? (
                    <ul className="month-agenda__list">
                      {dayItems.map((item) => {
                        const kind: PlanKind = inferPlanKind(item)
                        const described = describePlanWhen(item, day.iso, dayItems)
                        const label = shownLabel(item)
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="month-agenda__event"
                              data-kind={kind}
                              aria-label={planAccessibleName(label, item.title, described)}
                              onClick={() => onEditItem(item)}
                            >
                              <span className="month-agenda__kind"><KindMark item={item} /></span>
                              {word}
                              <span className="month-agenda__title">{item.title}</span>
                              {word}
                              <PlanWhen item={item} day={day.iso} dayItems={dayItems} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="month-agenda__empty">No events</p>
                  )}
                  <button type="button" className="month-add" onClick={() => onAddItem(day.iso)}>
                    Add something on {label}
                  </button>
                </article>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
