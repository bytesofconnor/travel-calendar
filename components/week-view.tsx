"use client"

import { useTripStore, getDaysInWeek, getItemsForWeek, type TripItem, addDays } from "@/lib/kanban-store"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState } from "react"
import { ItemDialog } from "./item-dialog"
import { TripItemCard } from "./trip-item-card"

const colorClasses = {
  violet: "bg-violet-500/20 border-violet-500/40 text-violet-200",
  blue: "bg-blue-500/20 border-blue-500/40 text-blue-200",
  emerald: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
  amber: "bg-amber-500/20 border-amber-500/40 text-amber-200",
  rose: "bg-rose-500/20 border-rose-500/40 text-rose-200",
}

export function WeekView() {
  const { items, currentWeekStart, nextWeek, prevWeek } = useTripStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<TripItem | null>(null)

  const days = getDaysInWeek(currentWeekStart)
  const weekItems = getItemsForWeek(items, currentWeekStart)
  const weekEnd = addDays(currentWeekStart, 6)

  const startDate = new Date(currentWeekStart + "T12:00:00")
  const endDate = new Date(weekEnd + "T12:00:00")
  const weekLabel = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
    " - " + endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">Peru 2026</h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevWeek}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex flex-col items-center border-r border-border py-3 last:border-r-0"
          >
            <span className="text-xs font-medium text-muted-foreground">{day.dayName}</span>
            <span className="mt-0.5 text-lg font-semibold">{day.dayNum}</span>
            <span className="text-[10px] text-muted-foreground">{day.month}</span>
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
        <div className="relative p-2 md:p-3">
          {itemRows.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No plans yet. Tap a day to add something.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {itemRows.map((row, rowIndex) => (
                <div key={rowIndex} className="relative grid h-auto min-h-[60px] grid-cols-7 gap-1 md:min-h-[72px] md:gap-2">
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
        <div className="grid grid-cols-7 gap-1 px-2 pb-4 md:px-3">
          {days.map((day) => (
            <button
              key={day.date}
              onClick={() => handleAddItem(day.date)}
              className="flex h-9 items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
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
