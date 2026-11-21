import { Bus, Car, CarTaxiFront, Footprints, Plane, TrainFront, Van, type LucideIcon } from "lucide-react"

import { travelLabel, type TravelMode } from "@/lib/travel-mode"

const ICONS: Record<TravelMode | "ride", LucideIcon> = {
  flight: Plane,
  train: TrainFront,
  bus: Bus,
  shuttle: Van,
  taxi: CarTaxiFront,
  walk: Footprints,
  ride: Car,
}

export function travelIcon(mode: TravelMode | "ride"): LucideIcon {
  return ICONS[mode]
}

export function TravelMark({
  mode,
  label,
  className,
}: {
  mode: TravelMode | "ride"
  label?: string
  className?: string
}) {
  const Icon = ICONS[mode]
  const text = label ?? (mode === "ride" ? "Ride" : travelLabel(mode))
  return (
    <span className={className ? `inline-flex items-center gap-1 ${className}` : "inline-flex items-center gap-1"}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  )
}
