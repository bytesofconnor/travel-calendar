"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react"

import {
  addDays,
  generateICS,
  getItemsForDate,
  getDaysInWeek,
  getItemsForWeek,
  getLocationById,
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
  const [mobileMode, setMobileMode] = useState<"day" | "agenda">("day")
  const [mobileSelectedDate, setMobileSelectedDate] = useState(currentWeekStart)
  const [mounted, setMounted] = useState(false)

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

  function handleAddItem(date: string) {
    setSelectedDate(date)
    setEditingItem(null)
    setDialogOpen(true)
  }

  function handleEditItem(item: TripItem) {
    setEditingItem(item)
    setSelectedDate(null)
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

  function getDayAccentColors(dayDate: string) {
    const dayItems = getItemsForDate(items, dayDate)
    const colors = new Set<string>()

    dayItems.forEach((item) => {
      colors.add(getLocationById(item.location).color)
      if (item.locationTo) {
        colors.add(getLocationById(item.locationTo).color)
      }
    })

    return Array.from(colors).slice(0, 3)
  }

  const itemRows = getItemRows()
  const visibleItemRows = itemRows.slice(0, MAX_DESKTOP_ITEM_ROWS)
  const mobileSelectedDay = days.find((day) => day.date === mobileSelectedDate) ?? days[0]
  const mobileDayItems = getItemsForDate(items, mobileSelectedDay.date)
  const agendaDays = days
    .map((day) => ({
      ...day,
      items: getItemsForDate(items, day.date),
    }))
    .filter((day) => day.items.length > 0)
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
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-2 md:hidden">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Week View</h2>
          <p className="text-xs text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1 self-start">
          <button
            onClick={() => {
              setCurrentMonth(getMonthStart(currentWeekStart))
              setViewMode("month")
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
            title="Month view"
          >
            <CalendarDays className="h-5 w-5 md:h-5 md:w-5" />
          </button>
          <button
            onClick={handleExportCalendar}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
            title="Export calendar"
          >
            <Download className="h-5 w-5 md:h-5 md:w-5" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={prevWeek}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
          >
            <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
          </button>
          <button
            onClick={nextWeek}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
          >
            <ChevronRight className="h-5 w-5 md:h-5 md:w-5" />
          </button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-1.5 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMobileMode("day")}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              mobileMode === "day" ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setMobileMode("agenda")}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              mobileMode === "agenda" ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            Agenda
          </button>
        </div>
      </div>

      {mobileMode === "day" ? (
        <div className="border-b border-border px-4 py-1.5 md:hidden">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const isSelected = day.date === mobileSelectedDay.date
              const isToday = day.date === todayDate
              const accentColors = getDayAccentColors(day.date)

              return (
                <button
                  key={day.date}
                  onClick={() => setMobileSelectedDate(day.date)}
                  className={`rounded-[18px] px-1 py-1.5 text-center transition-colors ${
                    isSelected ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wide">{day.dayName}</div>
                  <div className={`mt-0.5 text-[1.35rem] font-semibold ${isToday && !isSelected ? "text-primary" : ""}`}>{day.dayNum}</div>
                  <div className="text-[11px]">{day.month}</div>
                  <div className="mt-1 flex h-1.5 items-center justify-center gap-1">
                    {accentColors.length > 0 ? (
                      accentColors.map((color) => (
                        <span
                          key={`${day.date}-${color}`}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.85 }}
                        />
                      ))
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 py-3 md:hidden">
          {mobileMode === "day" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    {new Date(mobileSelectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mobileDayItems.length === 0
                      ? "No plans yet"
                      : `${mobileDayItems.length} plan${mobileDayItems.length === 1 ? "" : "s"} for this day`}
                  </div>
                </div>
                <button
                  onClick={() => handleAddItem(mobileSelectedDay.date)}
                  className="flex h-11 items-center justify-center rounded-2xl bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </button>
              </div>

              {mobileDayItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-background/25 px-4 py-8 text-center">
                  <div className="text-base font-medium text-foreground">Nothing planned yet</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Add a stay, flight, or idea for this day.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {mobileDayItems.map((item) => (
                    <div key={item.id} className="min-h-[116px]">
                      <TripItemCard item={item} onEdit={() => handleEditItem(item)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {agendaDays.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-background/25 px-4 py-8 text-center">
                  <div className="text-base font-medium text-foreground">This week is still open</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Tap a day above to start planning, or switch back to the day view.
                  </div>
                </div>
              ) : (
                agendaDays.map((day) => (
                  <section key={day.date} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold">
                          {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {day.items.length} plan{day.items.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddItem(day.date)}
                        className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {day.items.map((item) => (
                        <div key={item.id} className="min-h-[116px]">
                          <TripItemCard item={item} onEdit={() => handleEditItem(item)} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
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
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate}
        editItem={editingItem}
        currentUserName={currentUserName}
        isSaving={isMutating}
        isDeleting={isMutating}
        onSave={onSaveItem}
        onDelete={onDeleteItem}
      />
    </div>
  )
}
