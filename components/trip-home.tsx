"use client"

import { useState } from "react"

import type { GapAction, TripGap, TripHomeModel, UpcomingItem } from "@/lib/trip-home/detect"
import { initial } from "@/lib/trip-kind"
import { TravelMark } from "@/components/travel-mark"
import { readTravelMode } from "@/lib/travel-mode"
import { DayWeather, type DayWeatherState } from "@/components/weather-chip"

export type TripHomeMember = {
  userId: string
  displayName: string
  image?: string | null
}

export type TripHomeClaim = {
  gapId: string
  userId: string
  displayName: string
}

type TripHomeProps = {
  model: TripHomeModel
  members: TripHomeMember[]
  claims: TripHomeClaim[]
  currentUserId?: string
  onClaim: (gapId: string, claimed: boolean) => void
  onAction: (action: GapAction) => void
  onOpenItem: (id: string) => void
  weather?: DayWeatherState
  className?: string
}

function UpcomingMark({ item }: { item: UpcomingItem }) {
  const mode = readTravelMode(item.mark.toLowerCase()) ?? (item.mark === "Ride" ? "ride" : undefined)
  if (!mode) return <>{item.mark}</>
  return <TravelMark mode={mode} label={item.mark} />
}

export function TripHome({
  model,
  members,
  claims,
  currentUserId,
  onClaim,
  onAction,
  onOpenItem,
  weather,
  className,
}: TripHomeProps) {
  const [live, setLive] = useState("")
  const [next, ...rest] = model.upcoming
  if (!next && model.gaps.length === 0) return null

  function claim(gap: TripGap, claimed: boolean) {
    onClaim(gap.id, claimed)
    setLive(claimed ? `You have ${gap.title}` : `Released ${gap.title}`)
  }

  return (
    <section className={className ? `trip-home ${className}` : "trip-home"} data-trip-home="" aria-label="Trip home">
      <p className="trip-home__live" aria-live="polite">
        {live}
      </p>
      <div className="trip-home__section">
        <h2 className="trip-home__kicker">What&apos;s next</h2>
        {next ? (
          <>
            <button
              type="button"
              className="trip-home__hero"
              data-kind={next.kind}
              onClick={() => onOpenItem(next.id)}
            >
              <span className="trip-home__copy">
                <span className="trip-home__kind"><UpcomingMark item={next} /></span>
                <span className="trip-home__name">{next.title}</span>
                <span className="trip-home__when">{next.whenLabel}</span>
              </span>
              <span className="trip-home__countdown">{next.countdown}</span>
            </button>
            {weather ? (
              <DayWeather date={next.startDate} readings={weather.readings} units={weather.units} />
            ) : null}
            {rest.length > 0 ? (
              <ol className="trip-home__list">
                {rest.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="trip-home__row" onClick={() => onOpenItem(item.id)}>
                      <span className="trip-home__copy">
                        <span className="trip-home__kind"><UpcomingMark item={item} /></span>
                        <span className="trip-home__name">{item.title}</span>
                      </span>
                      <span className="trip-home__countdown">{item.countdown}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <p className="trip-home__quiet">Nothing else is coming up.</p>
        )}
      </div>
      <div className="trip-home__section">
        <h2 className="trip-home__kicker">What&apos;s missing</h2>
        {model.covered ? (
          <p className="trip-home__covered" role="status">
            Everything&apos;s covered
          </p>
        ) : (
          <ul className="trip-home__gaps">
            {model.gaps.map((gap) => {
              const claimRow = claims.find((entry) => entry.gapId === gap.id)
              const holder = claimRow ? members.find((member) => member.userId === claimRow.userId) : undefined
              const mine = Boolean(claimRow && currentUserId && claimRow.userId === currentUserId)
              const holderName = mine ? "You" : (holder?.displayName ?? claimRow?.displayName ?? "Someone")
              return (
                <li key={gap.id} className="trip-home__gap" data-kind={gap.kind}>
                  <p className="trip-home__name">{gap.title}</p>
                  <p className="trip-home__detail">{gap.detail}</p>
                  {claimRow ? (
                    <p className="trip-home__who">
                      <span className="trip-home__avatar" aria-hidden="true">
                        {holder?.image ? (
                          <span
                            className="trip-home__avatar-photo"
                            style={{ backgroundImage: `url("${holder.image.replace(/["\\)]/g, "")}")` }}
                          />
                        ) : (
                          initial(holderName === "You" ? (holder?.displayName ?? "You") : holderName)
                        )}
                      </span>
                      <span>
                        {holderName} {mine ? "have" : "has"} this
                      </span>
                    </p>
                  ) : null}
                  <div className="trip-home__actions">
                    <button
                      type="button"
                      className="trip-home__btn"
                      onClick={() => onAction(gap.action)}
                      aria-label={`${gap.action.label}: ${gap.title}`}
                    >
                      {gap.action.label}
                    </button>
                    {mine ? (
                      <button
                        type="button"
                        className="trip-home__btn trip-home__btn--ghost"
                        onClick={() => claim(gap, false)}
                        aria-label={`Release ${gap.title}`}
                      >
                        Release
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="trip-home__btn trip-home__btn--ghost"
                        onClick={() => claim(gap, true)}
                        aria-label={claimRow ? `I'll take it: ${gap.title}` : `I've got it: ${gap.title}`}
                      >
                        {claimRow ? "I'll take it" : "I've got it"}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
