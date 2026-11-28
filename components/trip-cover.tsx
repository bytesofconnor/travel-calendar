"use client"

import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface TripCoverProps {
  tripName: string
  meta: string
  coverImageUrl?: string
  showHairline?: boolean
  onOpenTrips?: () => void
  tripsOpen?: boolean
  className?: string
}

export function SpectrumHairline({ className }: { className?: string }) {
  return (
    <div className={cn("spectrum-hairline", className)} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

export function TripCover({
  tripName,
  meta,
  coverImageUrl,
  showHairline = true,
  onOpenTrips,
  tripsOpen = false,
  className,
}: TripCoverProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <div className="trip-cover">
        <div className="trip-cover__inner relative">
          {coverImageUrl ? (
            <div
              className="trip-cover__media"
              style={{ backgroundImage: `url('${coverImageUrl}')` }}
              aria-hidden="true"
            />
          ) : null}
          <div className="trip-cover__content">
            <div className="trip-cover__brand">Travel Calendar</div>
            {onOpenTrips ? (
              <h1 className="m-0">
                <button
                  type="button"
                  className="trip-cover__switch"
                  aria-haspopup="dialog"
                  aria-expanded={tripsOpen}
                  onClick={onOpenTrips}
                >
                  <span className="trip-cover__title">{tripName}</span>
                  <ChevronDown className="trip-cover__chevron" aria-hidden="true" />
                  <span className="sr-only">Switch trip</span>
                </button>
              </h1>
            ) : (
              <h1 className="trip-cover__title">{tripName}</h1>
            )}
            <p className="trip-cover__meta tabular-nums">{meta}</p>
          </div>
        </div>
      </div>
      {showHairline ? <SpectrumHairline /> : null}
    </div>
  )
}
