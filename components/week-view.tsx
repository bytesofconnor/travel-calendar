"use client"

import { useTripStore, getDaysInWeek, getItemsForWeek, type TripItem, addDays, generateICS } from "@/lib/kanban-store"
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays, Download } from "lucide-react"
import { useState, useEffect } from "react"
import { ItemDialog } from "./item-dialog"
import { TripItemCard } from "./trip-item-card"

export function WeekView() {
  const { items, currentWeekStart, nextWeek, prevWeek, setViewMode } = useTripStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<TripItem | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const days = getDaysInWeek(currentWeekStart)
  const weekItems = getItemsForWeek(items, currentWeekStart)
  const weekEnd = addDays(currentWeekStart, 6)

  const startDate = new Date(currentWeekStart + "T12:00:00")
  const endDate = new Date(weekEnd + "T12:00:00")
  const weekLabel = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " - " + endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const handleAddItem = (date: string) => {
    setSelectedDate(date)
    setEditingItem(null)
    setDialogOpen(true)
  }

  const handleEditItem = (item: TripItem) => {
    setEditingItem(item)
    setSelectedDate(null)
    setDialogOpen(true)
  }

  const handleExportCalendar = () => {
    const ics = generateICS(items)
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "peru-bolivia-2026.ics"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate item positioning for multi-day spans
  const getItemStyle = (item: TripItem) => {
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

  // Group items by their visual row to prevent overlap
  const getItemRows = () => {
    const rows: TripItem[][] = []
    
    const sortedItems = [...weekItems].sort((a, b) => {
      const aStart = new Date(a.startDate).getTime()
      const bStart = new Date(b.startDate).getTime()
      if (aStart !== bStart) return aStart - bStart
      const aDuration = new Date(a.endDate).getTime() - aStart
      const bDuration = new Date(b.endDate).getTime() - bStart
      return bDuration - aDuration
    })

    for (const item of sortedItems) {
      const { startDayIndex, span } = getItemStyle(item)
      const itemRange = { start: startDayIndex, end: startDayIndex + span - 1 }
      
      let placed = false
      for (const row of rows) {
        const hasConflict = row.some(existingItem => {
          const existing = getItemStyle(existingItem)
          const existingRange = { start: existing.startDayIndex, end: existing.startDayIndex + existing.span - 1 }
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

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight md:text-lg">Peru & Bolivia 2026</h1>
          <p className="text-xs text-muted-foreground md:text-sm">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* View switcher */}
          <button
            onClick={() => setViewMode("month")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
            title="Month view"
          >
            <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          
          {/* Export button */}
          <button
            onClick={handleExportCalendar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
            title="Export to Calendar"
          >
            <Download className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          
          <div className="mx-1 h-4 w-px bg-border" />
          
          <button
            onClick={prevWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            onClick={nextWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:w-9"
          >
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
      </header>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex flex-col items-center border-r border-border py-2 last:border-r-0 md:py-3"
          >
            <span className="text-[10px] font-medium text-muted-foreground md:text-xs">{day.dayName}</span>
            <span className="text-sm font-semibold md:mt-0.5 md:text-lg">{day.dayNum}</span>
            <span className="text-[9px] text-muted-foreground md:text-[10px]">{day.month}</span>
          </div>
        ))}
      </div>

      {/* Items Area */}
      <div className="relative flex-1 overflow-y-auto">
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
          {days.map((day, i) => (
            <div key={day.date} className={`border-r border-border/50 ${i === 6 ? "border-r-0" : ""}`} />
          ))}
        </div>

        {/* Items */}
        <div className="relative p-1.5 md:p-3">
          {itemRows.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground md:h-32 md:text-sm">
              No plans yet. Tap a day to add something.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 md:gap-2">
              {itemRows.map((row, rowIndex) => (
                <div key={rowIndex} className="relative grid h-auto min-h-[52px] grid-cols-7 gap-0.5 md:min-h-[68px] md:gap-1">
                  {row.map((item) => {
                    const { startDayIndex, span } = getItemStyle(item)
                    return (
                      <div
                        key={item.id}
                        className="absolute inset-y-0 px-0.5"
                        style={{
                          left: `${(startDayIndex / 7) * 100}%`,
                          width: `${(span / 7) * 100}%`,
                        }}
                      >
                        <TripItemCard item={item} onEdit={() => handleEditItem(item)} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add buttons row */}
        <div className="grid grid-cols-7 gap-0.5 px-1.5 pb-3 md:gap-1 md:px-3 md:pb-4">
          {days.map((day) => (
            <button
              key={day.date}
              onClick={() => handleAddItem(day.date)}
              className="flex h-8 items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground md:h-9"
            >
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          ))}
        </div>
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate}
        editItem={editingItem}
      />
    </div>
  )
}
