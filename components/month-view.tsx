"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, LayoutDashboard, Plus } from "lucide-react"

import {
  getDaysInMonth,
  getItemsForDate,
  getLocationById,
  getTodayString,
  type TripItem,
  type TripItemInput,
  useCalendarStore,
} from "@/lib/kanban-store"
import { ItemDialog } from "./item-dialog"

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface MonthViewProps {
  items: TripItem[]
  currentUserName?: string
  isMutating?: boolean
  onSaveItem: (input: TripItemInput, existingItem?: TripItem) => Promise<void> | void
  onDeleteItem: (itemId: string) => Promise<void> | void
}

export function MonthView({
  items,
  currentUserName,
  isMutating = false,
  onSaveItem,
  onDeleteItem,
}: MonthViewProps) {
  const { currentMonth, nextMonth, prevMonth, setCurrentWeek, setViewMode } = useCalendarStore()
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
  const today = getTodayString()
  const monthAgendaDays = days.filter((day) => day.isCurrentMonth && getItemsForDate(items, day.date).length > 0)

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

  function handleDayClick(date: string) {
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
      <div className="flex items-start justify-between gap-3 px-4 py-3 md:items-center md:py-4">
        <div>
          <h2 className="text-lg font-semibold md:text-xl">{monthLabel}</h2>
          <p className="text-xs text-muted-foreground md:text-sm">Tap any date to jump into that week.</p>
        </div>
        <div className="flex items-center gap-1 self-start md:self-auto">
          <button
            onClick={() => setViewMode("week")}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Week view"
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/25 px-4 py-5 text-center">
              <div className="text-base font-medium text-foreground">Your trip is empty for now</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Add your first plan from any day cell, then invite your partner to start filling things in together.
              </div>
            </div>
          </div>
        )}
        <div className="px-4 pb-4 md:hidden">
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((name) => (
              <div key={name} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                {name}
              </div>
            ))}
            {days.map((day, index) => {
              const dayItems = getItemsForDate(items, day.date)
              const isToday = day.date === today

              return (
                <button
                  key={`${day.date}-${index}`}
                  onClick={() => handleDayClick(day.date)}
                  className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-center transition-colors ${
                    day.isCurrentMonth ? "opacity-100" : "opacity-40"
                  } ${isToday ? "border-primary/60" : ""}`}
                >
                  <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{day.dayNum}</span>
                  {dayItems.length > 0 && (
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {dayItems.length} plan{dayItems.length === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold">This month</h3>
              <p className="text-sm text-muted-foreground">Tap any date above to jump into that week.</p>
            </div>

            {monthAgendaDays.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/25 px-4 py-6 text-center">
                <div className="text-base font-medium text-foreground">No plans in this month yet</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Pick a date above to add your first item.
                </div>
              </div>
            ) : (
              monthAgendaDays.map((day) => {
                const dayItems = getItemsForDate(items, day.date)

                return (
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
                          {dayItems.length} plan{dayItems.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddItem(day.date)}
                        className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-2">
                      {dayItems.map((item) => {
                        const location = getLocationById(item.location)
                        const locationTo = item.locationTo ? getLocationById(item.locationTo) : null

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleEditItem(item)}
                            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:brightness-125"
                            style={{
                              background: locationTo
                                ? `linear-gradient(90deg, ${location.color}35 0%, ${location.color}35 50%, ${locationTo.color}35 50%, ${locationTo.color}35 100%)`
                                : `${location.color}25`,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {locationTo ? `${location.name} → ${locationTo.name}` : location.name}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[840px] md:min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border px-2">
              {dayNames.map((name) => (
                <div key={name} className="py-3 text-center text-sm font-medium text-muted-foreground">
                  {name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border p-px">
              {days.map((day, index) => {
                const dayItems = getItemsForDate(items, day.date)
                const isToday = day.date === today

                return (
                  <div
                    key={`${day.date}-${index}`}
                    className={`group relative min-h-[124px] bg-background p-2.5 transition-colors md:min-h-[112px] md:p-2 ${
                      !day.isCurrentMonth ? "opacity-40" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleDayClick(day.date)}
                      className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-secondary ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {day.dayNum}
                    </button>

                    <div className="flex flex-col gap-1">
                      {dayItems.slice(0, 3).map((item) => {
                        const location = getLocationById(item.location)
                        const locationTo = item.locationTo ? getLocationById(item.locationTo) : null

                        return (
                          <button
                            key={item.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleEditItem(item)
                            }}
                            className="flex items-center gap-1 truncate rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors hover:brightness-125 md:px-1.5 md:py-1"
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
                        <span className="px-1 text-[10px] text-muted-foreground">
                          +{dayItems.length - 3} more
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleAddItem(day.date)
                      }}
                      className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-80 transition-all hover:bg-secondary hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Add item on ${day.date}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
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
