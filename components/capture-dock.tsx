"use client"

import { cn } from "@/lib/utils"
import type { PlanKind } from "@/lib/trip-kind"

export type CaptureKind = "stay" | "flight" | "place" | "note"

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

export function AddTripButton({ onAdd, className }: { onAdd: () => void; className?: string }) {
  return (
    <button type="button" className={cn("add-trip", className)} aria-label="Add to the trip" onClick={onAdd}>
      <span aria-hidden="true">+</span>
    </button>
  )
}
