"use client"

import { useEffect, useId, useRef, useState } from "react"

import { initial } from "@/lib/trip-kind"
import { firstName, orderTravelers, travelerAccessibleName, travelerFaces, travelerLabel, type TravelerName } from "@/lib/travelers"

export function TravelerStack({
  travelers,
  currentUserId,
  onOpen,
  selectedUserId,
  onSelectPerson,
  className = "",
}: {
  travelers: readonly TravelerName[]
  currentUserId?: string
  onOpen?: () => void
  selectedUserId?: string | null
  onSelectPerson?: (userId: string) => void
  className?: string
}) {
  const label = travelerLabel(travelers, currentUserId)
  const name = travelerAccessibleName(travelers, currentUserId)
  const ordered = orderTravelers(travelers, currentUserId)
  const { shown, extra } = travelerFaces(travelers, currentUserId)
  const overflow = ordered.slice(shown.length)
  const [extraOpen, setExtraOpen] = useState(false)
  const extraRef = useRef<HTMLDivElement>(null)
  const extraId = useId()
  const filtering = Boolean(onSelectPerson)

  useEffect(() => {
    if (!extraOpen) return
    function onPointer(event: PointerEvent) {
      if (!extraRef.current?.contains(event.target as Node)) setExtraOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setExtraOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [extraOpen])

  function faceButton(person: TravelerName, extraFace = false) {
    const pressed = selectedUserId === person.userId
    const you = person.userId === currentUserId
    const given = firstName(person.displayName)
    return (
      <button
        key={person.userId}
        type="button"
        data-traveler-face={extraFace ? undefined : ""}
        aria-pressed={pressed}
        aria-label={`${given}, ${pressed ? "showing their plans" : "show their plans"}`}
        onClick={() => {
          onSelectPerson?.(person.userId)
          setExtraOpen(false)
        }}
        className={`traveler-face ${you ? "traveler-face--you" : "traveler-face--other"} ${pressed ? "traveler-face--pressed" : ""}`}
      >
        {initial(person.displayName)}
        {pressed ? <span className="traveler-face__dot" aria-hidden="true" /> : null}
      </button>
    )
  }

  const overflowPressed = overflow.some((person) => person.userId === selectedUserId)

  return (
    <div
      className={`inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full py-1 pr-1 pl-1 ${className}`}
      role="group"
      aria-label={name}
      data-travelers=""
    >
      <span className="flex shrink-0 items-center">
        {shown.map((person, index) => (
          <span key={person.userId} className="relative" style={{ marginLeft: index === 0 ? 0 : -6, zIndex: index + 1 }}>
            {filtering ? faceButton(person) : (
              <span
                data-traveler-face=""
                className={`traveler-face ${person.userId === currentUserId ? "traveler-face--you" : "traveler-face--other"}`}
              >
                {initial(person.displayName)}
              </span>
            )}
          </span>
        ))}
        {extra > 0 ? (
          <span ref={extraRef} className="relative" style={{ marginLeft: -6, zIndex: shown.length + 1 }}>
            {filtering ? (
              <>
                <button
                  type="button"
                  data-traveler-extra=""
                  className={`traveler-face traveler-face--other ${overflowPressed ? "traveler-face--pressed" : ""}`}
                  aria-expanded={extraOpen}
                  aria-controls={extraId}
                  aria-label={`${extra} more ${extra === 1 ? "traveler" : "travelers"}`}
                  onClick={() => setExtraOpen((open) => !open)}
                >
                  +{extra}
                </button>
                {extraOpen ? (
                  <span id={extraId} role="group" aria-label="More travelers" className="traveler-extra">
                    {overflow.map((person) => faceButton(person, true))}
                  </span>
                ) : null}
              </>
            ) : (
              <span data-traveler-extra="" className="traveler-face traveler-face--other">
                +{extra}
              </span>
            )}
          </span>
        ) : null}
      </span>
      {onOpen ? (
        <button type="button" className="traveler-label" onClick={onOpen} aria-label={`${name}. ${label}`}>
          {label}
        </button>
      ) : (
        <span className="traveler-label">{label}</span>
      )}
    </div>
  )
}
