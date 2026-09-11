"use client"

import { useEffect, useRef, useState } from "react"
import { BedDouble, CalendarDays, ChevronLeft, ChevronRight, Download, Lightbulb, Plane, Plus } from "lucide-react"

import {
  addDays,
  generateICS,
  getItemsForDate,
  getDaysInWeek,
  getItemsForWeek,
  getMonthStart,
  type TripItem,
  type TripItemInput,
  useCalendarStore,
} from "@/lib/kanban-store"
import { ItemDialog } from "./item-dialog"
import { TabViewHeader } from "./tab-view-header"
import { TabViewShell } from "./tab-view-shell"
import { TripItemCard } from "./trip-item-card"

const MAX_DESKTOP_ITEM_ROWS = 3

interface WeekViewProps {
  items: TripItem[]
  currentUserName?: string
  isMutating?: boolean
  onSaveItem: (input: TripItemInput, existingItem?: TripItem) => Promise<void> | void
  onDeleteItem: (itemId: string) => Promise<void> | void
}

export function WeekView({
  items,
  currentUserName,
  isMutating = false,
  onSaveItem,
  onDeleteItem,
}: WeekViewProps) {
  const { currentWeekStart, nextWeek, prevWeek, setCurrentMonth, setCurrentWeek, setViewMode } = useCalendarStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<TripItem | null>(null)
  const [initialInput, setInitialInput] = useState<Partial<TripItemInput> | null>(null)
  const [initialTravel, setInitialTravel] = useState(false)
  const [mobileSelectedDate, setMobileSelectedDate] = useState(currentWeekStart)
  const [mounted, setMounted] = useState(false)
  const selectedDayRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const days = getDaysInWeek(currentWeekStart)
  const weekItems = getItemsForWeek(items, currentWeekStart)
  const weekEnd = addDays(currentWeekStart, 6)

  const startDate = new Date(currentWeekStart + "T12:00:00")
  const endDate = new Date(weekEnd + "T12:00:00")
  const weekLabel = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`
  const todayDate = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const weekDays = getDaysInWeek(currentWeekStart)
    const nextMobileDate = weekDays.find((day) => day.date === todayDate)?.date ?? currentWeekStart
    setMobileSelectedDate(nextMobileDate)
  }, [currentWeekStart, todayDate])

  useEffect(() => {
    if (!mounted) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    selectedDayRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }, [mobileSelectedDate, mounted])

  function handleAddItem(date: string, opts?: { travel?: boolean; title?: string }) {
    setSelectedDate(date)
    setEditingItem(null)
    setInitialInput(opts?.title ? { title: opts.title } : null)
    setInitialTravel(Boolean(opts?.travel))
    setDialogOpen(true)
  }

  function handleEditItem(item: TripItem) {
    setEditingItem(item)
    setSelectedDate(null)
    setInitialInput(null)
    setInitialTravel(false)
    setDialogOpen(true)
  }

  function handleShowMoreForDate(date: string) {
    setCurrentMonth(getMonthStart(date))
    setCurrentWeek(date)
    setViewMode("month")
  }

  function handleExportCalendar() {
    const ics = generateICS(items)
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "shared-trip-calendar.ics"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function getItemStyle(item: TripItem) {
    const itemStart = new Date(item.startDate + "T12:00:00")
    const itemEnd = new Date(item.endDate + "T12:00:00")
    const weekStartDate = new Date(currentWeekStart + "T12:00:00")
    const weekEndDate = new Date(weekEnd + "T12:00:00")

    const visibleStart = itemStart < weekStartDate ? weekStartDate : itemStart
    const visibleEnd = itemEnd > weekEndDate ? weekEndDate : itemEnd
    const startDayIndex = Math.round((visibleStart.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const endDayIndex = Math.round((visibleEnd.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const span = endDayIndex - startDayIndex + 1

    return { startDayIndex, span }
  }

  function getItemRows() {
    const rows: TripItem[][] = []
    const sortedItems = [...weekItems].sort((left, right) => {
      const leftStart = new Date(left.startDate).getTime()
      const rightStart = new Date(right.startDate).getTime()
      if (leftStart !== rightStart) {
        return leftStart - rightStart
      }

      const leftDuration = new Date(left.endDate).getTime() - leftStart
      const rightDuration = new Date(right.endDate).getTime() - rightStart
      return rightDuration - leftDuration
    })

    for (const item of sortedItems) {
      const { startDayIndex, span } = getItemStyle(item)
      const itemRange = { start: startDayIndex, end: startDayIndex + span - 1 }
      let placed = false

      for (const row of rows) {
        const hasConflict = row.some((existingItem) => {
          const existing = getItemStyle(existingItem)
          const existingRange = {
            start: existing.startDayIndex,
            end: existing.startDayIndex + existing.span - 1,
          }
          return !(itemRange.end < existingRange.start || itemRange.start > existingRange.end)
        })

        if (!hasConflict) {
          row.push(item)
          placed = true
          break
        }
      }

      if (!placed) {
        rows.push([item])
      }
    }

    return rows
  }

  const itemRows = getItemRows()
  const visibleItemRows = itemRows.slice(0, MAX_DESKTOP_ITEM_ROWS)
  const mobileSelectedDay = days.find((day) => day.date === mobileSelectedDate) ?? days[0]
  const timelineDays = days.map((day) => ({
    ...day,
    items: getItemsForDate(items, day.date),
  }))
  const desktopOverflowByDate = Object.fromEntries(
    days.map((day) => {
      const totalItems = getItemsForDate(items, day.date)
      const visibleItems = visibleItemRows.flatMap((row) => row).filter((item) => {
        const itemStart = item.startDate > currentWeekStart ? item.startDate : currentWeekStart
        const itemEnd = item.endDate < weekEnd ? item.endDate : weekEnd
        return day.date >= itemStart && day.date <= itemEnd
      })

      return [day.date, Math.max(0, totalItems.length - visibleItems.length)]
    }),
  ) as Record<string, number>

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {/* Mobile week rail + timeline */}
      <div className="week-rail border-b border-border md:hidden">
        <div className="flex items-center gap-0.5 px-1.5 pt-1.5">
          <button
            type="button"
            onClick={prevWeek}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-0 flex-1 text-center text-[12px] font-medium tabular-nums text-muted-foreground">
            {weekLabel}
          </p>
          <button
            type="button"
            onClick={() => {
              setCurrentMonth(getMonthStart(currentWeekStart))
              setViewMode("month")
            }}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Month
          </button>
          <button
            type="button"
            onClick={nextWeek}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 px-1.5 pb-1.5 pt-1" role="listbox" aria-label="Days this week">
          {timelineDays.map((day) => {
            const isSelected = day.date === mobileSelectedDay.date
            const isToday = day.date === todayDate
            const planCount = day.items.length

            return (
              <button
                key={day.date}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected ? "true" : "false"}
                onClick={() => setMobileSelectedDate(day.date)}
                aria-label={`${day.dayName} ${day.month} ${day.dayNum}${isToday ? ", today" : ""}${planCount ? `, ${planCount} plan${planCount === 1 ? "" : "s"}` : ""}`}
                className={`relative flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1.5 text-center transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className={`text-[10px] font-medium uppercase tracking-[0.08em] ${isSelected ? "text-primary-foreground/65" : ""}`}>
                  {day.dayName.slice(0, 1)}
                </span>
                <span className={`text-[14px] font-semibold leading-none tabular-nums ${isToday && !isSelected ? "text-[var(--brand)]" : ""}`}>
                  {day.dayNum}
                </span>
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    planCount > 0
                      ? isSelected
                        ? "bg-primary-foreground"
                        : "bg-foreground/50"
                      : isToday && !isSelected
                        ? "bg-[var(--brand)]"
                        : "bg-transparent"
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="md:hidden">
          {items.length === 0 ? (
            <div className="plans-welcome">
              <p className="plans-welcome__title">Start building the trip</p>
              <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                Drop in stays, flights, and ideas day by day. Your partner sees every change live.
              </p>
            </div>
          ) : null}
          {timelineDays.map((day) => {
            const isSelected = day.date === mobileSelectedDay.date
            const isToday = day.date === todayDate
            const dateObj = new Date(day.date + "T12:00:00")
            const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" })
            const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })

            return (
              <section
                key={day.date}
                ref={(node) => {
                  if (isSelected) selectedDayRef.current = node
                }}
                data-selected={isSelected ? "true" : "false"}
                className={`timeline-day border-b border-border px-4 py-2 transition-colors duration-150 ${
                  isSelected ? "bg-secondary/50" : "bg-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileSelectedDate(day.date)}
                    className="flex min-w-0 flex-1 items-baseline gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={`text-[13px] font-semibold tabular-nums ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {weekday}
                    </span>
                    <span className={`text-[13px] tabular-nums ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {monthDay}
                    </span>
                    {isToday ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_12%,transparent)]">
                        Today
                      </span>
                    ) : null}
                    {day.items.length > 0 ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        · {day.items.length}
                      </span>
                    ) : null}
                  </button>
                  {!isSelected && day.items.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileSelectedDate(day.date)
                        handleAddItem(day.date)
                      }}
                      className="flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] text-muted-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  ) : null}
                </div>

                {day.items.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {day.items.map((item) => (
                      <div key={item.id}>
                        <TripItemCard item={item} onEdit={() => handleEditItem(item)} />
                      </div>
                    ))}
                  </div>
                ) : null}

                {isSelected ? (
                  <div className="plan-composer mt-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem(day.date)}
                      className="plan-composer__field"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{items.length === 0 ? "What’s first — stay, flight, or idea?" : "Add a plan…"}</span>
                    </button>
                    <div className="plan-composer__types" role="group" aria-label="Quick add">
                      <button
                        type="button"
                        className="plan-composer__type"
                        onClick={() => handleAddItem(day.date, { title: "Stay" })}
                      >
                        <BedDouble className="h-3.5 w-3.5" />
                        Stay
                      </button>
                      <button
                        type="button"
                        className="plan-composer__type"
                        onClick={() => handleAddItem(day.date, { travel: true, title: "Flight" })}
                      >
                        <Plane className="h-3.5 w-3.5" />
                        Flight
                      </button>
                      <button
                        type="button"
                        className="plan-composer__type"
                        onClick={() => handleAddItem(day.date, { title: "Idea" })}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Idea
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>

        <TabViewShell className="hidden md:block px-4 pt-4" innerClassName="max-w-none flex-1 gap-4">
          <TabViewHeader
            kicker="Calendar"
            title="Week View"
            description={weekLabel}
            actions={
              <>
                <button
                  onClick={() => {
                    setCurrentMonth(getMonthStart(currentWeekStart))
                    setViewMode("month")
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Month view"
                >
                  <CalendarDays className="h-5 w-5" />
                </button>
                <button
                  onClick={handleExportCalendar}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Export calendar"
                >
                  <Download className="h-5 w-5" />
                </button>
                <div className="mx-1 h-4 w-px bg-border" />
                <button
                  onClick={prevWeek}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextWeek}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            }
          />

          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            <div className="grid grid-cols-7 border-b border-border">
              {days.map((day) => (
                <div key={day.date} className="flex flex-col items-center border-r border-border px-2 py-4 last:border-r-0">
                  <span className="text-xs font-medium text-muted-foreground">{day.dayName}</span>
                  <span className="mt-0.5 text-2xl font-semibold md:text-lg">{day.dayNum}</span>
                  <span className="text-xs text-muted-foreground">{day.month}</span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden grid-cols-7 md:grid">
              {days.map((day, index) => (
                <div key={day.date} className={`border-r border-border/50 ${index === 6 ? "border-r-0" : ""}`} />
              ))}
            </div>

            <div className="relative flex flex-1 flex-col px-2 pb-3 pt-3 md:px-3 md:pb-4 md:pt-4">
              {itemRows.length === 0 ? (
                <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/25 px-4 text-center">
                  <div className="text-base font-medium text-foreground">No plans yet</div>
                  <div className="max-w-sm text-sm text-muted-foreground">
                    Start building the trip together. Tap a day below to add your first stay, flight, or idea.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {visibleItemRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="relative grid h-[74px] grid-cols-7 gap-2">
                      {row.map((item) => {
                        const { startDayIndex, span } = getItemStyle(item)
                        return (
                          <div
                            key={item.id}
                            className="absolute inset-y-0 px-1"
                            style={{
                              left: `${(startDayIndex / 7) * 100}%`,
                              width: `${(span / 7) * 100}%`,
                            }}
                          >
                            <TripItemCard item={item} onEdit={() => handleEditItem(item)} compact />
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {itemRows.length > MAX_DESKTOP_ITEM_ROWS ? (
              <div className="grid grid-cols-7 gap-2 px-2 pb-2 md:px-3">
                {days.map((day) => (
                  <div key={day.date} className="flex min-h-6 items-center justify-center">
                    {desktopOverflowByDate[day.date] > 0 ? (
                      <button
                        onClick={() => handleShowMoreForDate(day.date)}
                        className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Show {desktopOverflowByDate[day.date]} more
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-7 gap-2 px-2 pb-5 md:px-3 md:pb-5">
              {days.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleAddItem(day.date)}
                  className="flex h-12 items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground"
                >
                  <Plus className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </TabViewShell>
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setInitialInput(null)
            setInitialTravel(false)
          }
        }}
        defaultDate={selectedDate}
        editItem={editingItem}
        initialInput={initialInput}
        initialTravel={initialTravel}
        currentUserName={currentUserName}
        isSaving={isMutating}
        isDeleting={isMutating}
        onSave={onSaveItem}
        onDelete={onDeleteItem}
      />
    </div>
  )
}
