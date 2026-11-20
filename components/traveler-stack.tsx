"use client"

import { initial } from "@/lib/trip-kind"
import { travelerAccessibleName, travelerFaces, travelerLabel, type TravelerName } from "@/lib/travelers"

export function TravelerStack({
  travelers,
  currentUserId,
  onOpen,
  className = "",
}: {
  travelers: readonly TravelerName[]
  currentUserId?: string
  onOpen?: () => void
  className?: string
}) {
  const label = travelerLabel(travelers, currentUserId)
  const name = travelerAccessibleName(travelers, currentUserId)
  const { shown, extra } = travelerFaces(travelers, currentUserId)
  const faces = (
    <>
      <span className="sr-only">{name}.</span>
      <span className="flex shrink-0 items-center" aria-hidden="true">
        {shown.map((person, index) => {
          const you = person.userId === currentUserId
          return (
            <span
              key={person.userId}
              data-traveler-face=""
              className={`relative inline-flex size-[32px] items-center justify-center rounded-full border-2 text-[12px] font-bold leading-none ${
                you ? "border-foreground bg-foreground text-background" : "border-foreground bg-background text-foreground"
              }`}
              style={{ marginLeft: index === 0 ? 0 : -8, zIndex: index + 1 }}
            >
              {initial(person.displayName)}
            </span>
          )
        })}
        {extra > 0 ? (
          <span
            data-traveler-extra=""
            className="relative inline-flex h-[32px] min-w-[32px] items-center justify-center rounded-full border-2 border-foreground bg-background px-1 text-[12px] font-bold leading-none text-foreground"
            style={{ marginLeft: -8, zIndex: shown.length + 1 }}
          >
            +{extra}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 text-left text-sm font-semibold leading-tight text-foreground">{label}</span>
    </>
  )
  const classes = `inline-flex min-h-[44px] max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full py-1 pr-3 pl-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`

  if (onOpen) {
    return (
      <button type="button" className={classes} data-travelers="" onClick={onOpen}>
        {faces}
      </button>
    )
  }

  return (
    <div className={classes} role="group" data-travelers="">
      {faces}
    </div>
  )
}
