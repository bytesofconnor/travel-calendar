"use client"

import { useState, type FormEvent } from "react"

import { cn } from "@/lib/utils"
import type { PlanKind } from "@/lib/trip-kind"

export type CaptureKind = "stay" | "flight" | "place" | "note"

interface CaptureDockProps {
  hint: string
  onCapture: (kind?: CaptureKind, text?: string) => void
  className?: string
}

const CHIPS: { kind: CaptureKind; label: string }[] = [
  { kind: "stay", label: "Stay" },
  { kind: "flight", label: "Flight" },
  { kind: "place", label: "Place" },
  { kind: "note", label: "Note" },
]

export function KindChip({
  kind,
  label,
  onClick,
  className,
  ariaLabel,
}: {
  kind: PlanKind | CaptureKind
  label: string
  onClick?: () => void
  className?: string
  ariaLabel?: string
}) {
  const chipKind =
    kind === "now" || kind === "ask" ? (kind === "ask" ? "ask" : "place") : kind
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(`kind-chip kind-chip--${chipKind} shrink-0`, className)}
    >
      <span className="kind-chip__dot" aria-hidden="true" />
      {label}
    </button>
  )
}

export function CaptureDock({ hint, onCapture, className }: CaptureDockProps) {
  const [text, setText] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem("capture")
    const value = (field instanceof HTMLInputElement ? field.value : text).trim()
    setText("")
    onCapture(undefined, value)
  }

  return (
    <div className={cn("capture-dock", className)} role="region" aria-label="Add to trip">
      <div className="story-shell">
      <form className="capture-dock__field" onSubmit={submit}>
        <span className="capture-dock__plus" aria-hidden="true">
          +
        </span>
        <input
          name="capture"
          className="capture-dock__input"
          aria-label={hint}
          placeholder={hint}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="sr-only">
          Add
        </button>
      </form>
      <div className="capture-dock__chips" role="group" aria-label="Plan kinds">
        {CHIPS.map((chip) => (
          <KindChip
            key={chip.kind}
            kind={chip.kind}
            label={chip.label}
            ariaLabel={`Add ${chip.label}`}
            onClick={() => onCapture(chip.kind)}
          />
        ))}
      </div>
      </div>
    </div>
  )
}
