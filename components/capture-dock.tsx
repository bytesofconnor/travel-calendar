"use client"

import { cn } from "@/lib/utils"
import type { PlanKind } from "@/lib/trip-kind"

export type CaptureKind = "stay" | "flight" | "place" | "note"

interface CaptureDockProps {
  hint: string
  onCapture: (kind?: CaptureKind) => void
  onOpenNotes?: () => void
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

export function CaptureDock({ hint, onCapture, onOpenNotes, className }: CaptureDockProps) {
  return (
    <div className={cn("capture-dock", className)} role="region" aria-label="Add to trip">
      <div className="story-shell">
      <button
        type="button"
        className="capture-dock__field"
        onClick={() => onCapture()}
        aria-label={hint}
      >
        <span className="capture-dock__plus" aria-hidden="true">
          +
        </span>
        <span className="capture-dock__hint">{hint}</span>
      </button>
      <div className="capture-dock__chips" role="group" aria-label="Plan kinds">
        {CHIPS.map((chip) => (
          <KindChip
            key={chip.kind}
            kind={chip.kind}
            label={chip.label}
            ariaLabel={`Add ${chip.label}`}
            onClick={() => {
              if (chip.kind === "note") {
                onOpenNotes?.()
                return
              }
              onCapture(chip.kind)
            }}
          />
        ))}
      </div>
      </div>
    </div>
  )
}
