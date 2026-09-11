"use client"

import { Check, PlusCircle, Users } from "lucide-react"

import { PeekSheet } from "@/components/peek-sheet"
import { Button } from "@/components/ui/button"
import { formatTripDateRange } from "@/lib/format-dates"
import type { Trip } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

interface TripsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trips: Trip[]
  activeTripId: string
  onSelectTrip: (tripId: string) => void
  onCreateTrip: () => void
  onJoinTrip: () => void
}

export function TripsSheet({
  open,
  onOpenChange,
  trips,
  activeTripId,
  onSelectTrip,
  onCreateTrip,
  onJoinTrip,
}: TripsSheetProps) {
  return (
    <PeekSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your trips"
      meta="Switch trips anytime — home is still the one you’re in."
    >
      <div className="flex h-full flex-col">
        <ul className="min-h-0 flex-1 list-none space-y-2 overflow-y-auto overscroll-contain px-4 py-4" aria-label="Trips">
          {trips.map((trip) => {
            const active = trip.id === activeTripId
            return (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTrip(trip.id)
                    onOpenChange(false)
                  }}
                  className={cn(
                    "flex w-full min-h-14 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-border bg-secondary ring-1 ring-[var(--together)]"
                      : "border-border bg-card hover:bg-secondary/60",
                  )}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-bold tracking-tight text-foreground">
                      {trip.name}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">
                      {formatTripDateRange(trip.startDate, trip.endDate)}
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-[var(--together)]" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="shrink-0 space-y-2 border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-12 w-full rounded-full text-[0.9375rem] font-bold"
            onClick={() => {
              onOpenChange(false)
              onCreateTrip()
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            New trip
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full rounded-full text-[0.9375rem] font-semibold"
            onClick={() => {
              onOpenChange(false)
              onJoinTrip()
            }}
          >
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
            Join with invite code
          </Button>
        </div>
      </div>
    </PeekSheet>
  )
}
