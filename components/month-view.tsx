"use client"

import { useTripStore, getDaysInMonth, getItemsForDate, type TripItem, getLocationById } from "@/lib/kanban-store"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { ItemDialog } from "./item-dialog"

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView() {
  const { items, currentMonth, nextMonth, prevMonth, setCurrentWeek, setViewMode } = useTripStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<TripItem | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const days = getDaysInMonth(currentMonth)
  const [year, month] = currentMonth.split("-").map(Number)
  const monthDate = new Date(year, month - 1, 1)
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

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

  const handleDayClick = (date: string) => {
    // Switch to week view for that date
    setCurrentWeek(date)
    setViewMode("week")
  }

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
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-border px-2">
        {dayNames.map((name) => (
          <div key={name} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-px bg-border p-px">
          {days.map((day, index) => {
            const dayItems = getItemsForDate(items, day.date)
            const isToday = day.date === new Date().toISOString().split("T")[0]
            
            return (
              <div
                key={`${day.date}-${index}`}
                className={`relative min-h-[80px] bg-background p-1 transition-colors md:min-h-[100px] ${
                  !day.isCurrentMonth ? "opacity-40" : ""
                }`}
              >
                <button
                  onClick={() => handleDayClick(day.date)}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-secondary ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {day.dayNum}
                </button>
                
                {/* Items */}
                <div className="flex flex-col gap-0.5">
                  {dayItems.slice(0, 3).map((item) => {
                    const location = getLocationById(item.location)
                    const locationTo = item.locationTo ? getLocationById(item.locationTo) : null
                    
                    return (
                      <button
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditItem(item)
                        }}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors hover:brightness-125"
                        style={{
                          background: locationTo 
                            ? `linear-gradient(90deg, ${location.color}40 0%, ${location.color}40 50%, ${locationTo.color}40 50%, ${locationTo.color}40 100%)`
                            : `${location.color}30`,
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                  {dayItems.length > 3 && (
                    <span className="px-1 text-[9px] text-muted-foreground">
                      +{dayItems.length - 3} more
                    </span>
                  )}
                </div>

                {/* Add button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddItem(day.date)
                  }}
                  className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100 md:opacity-0 md:hover:opacity-100"
                  style={{ opacity: undefined }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )
          })}
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
