"use client"

import { cn } from "@/lib/utils"

interface TripCoverProps {
  tripName: string
  meta: string
  coverImageUrl?: string
  showHairline?: boolean
  onBrandClick?: () => void
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
  onBrandClick,
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
            {onBrandClick ? (
              <button
                type="button"
                onClick={onBrandClick}
                aria-label="All trips"
                className="trip-cover__brand trip-cover__brand--button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Travel Calendar
              </button>
            ) : (
              <div className="trip-cover__brand">Travel Calendar</div>
            )}
            <h1 className="trip-cover__title">{tripName}</h1>
            <p className="trip-cover__meta tabular-nums">{meta}</p>
          </div>
        </div>
      </div>
      {showHairline ? <SpectrumHairline /> : null}
    </div>
  )
}
