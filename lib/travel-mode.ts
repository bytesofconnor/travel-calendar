import type { TravelMode } from "./plan-types.ts"

export type { TravelMode } from "./plan-types.ts"

export const TRAVEL_MODES: { id: TravelMode; label: string; picker: string }[] = [
  { id: "flight", label: "Flight", picker: "Flight" },
  { id: "train", label: "Train", picker: "Train" },
  { id: "bus", label: "Bus", picker: "Bus" },
  { id: "shuttle", label: "Shuttle", picker: "Shuttle" },
  { id: "taxi", label: "Taxi", picker: "Taxi/Rideshare" },
  { id: "walk", label: "Walk", picker: "Walk" },
]

const MODE_IDS = new Set<string>(TRAVEL_MODES.map((mode) => mode.id))

export function readTravelMode(value: string | undefined | null): TravelMode | undefined {
  const mode = value?.trim() ?? ""
  return MODE_IDS.has(mode) ? (mode as TravelMode) : undefined
}

export function travelLabel(mode: TravelMode): string {
  return TRAVEL_MODES.find((entry) => entry.id === mode)?.label ?? "Flight"
}

export function modeKeepsArriveDay(mode: TravelMode): boolean {
  return mode === "flight" || mode === "train" || mode === "bus"
}

export function guessTravelMode(text: string): TravelMode {
  const value = text.trim()
  if (/\b(fly|flight|flying|airline)\b/i.test(value)) return "flight"
  if (/\bwalk(ing)?\b/i.test(value)) return "walk"
  if (/\b(grab|uber|lyft|taxi|cab|rideshare)\b/i.test(value)) return "taxi"
  if (/\bshuttle\b/i.test(value)) return "shuttle"
  if (/\bbus\b/i.test(value)) return "bus"
  if (/\b(train|rail)\b/i.test(value)) return "train"
  return "flight"
}

export function carrierFrom(text: string): string {
  const brand = /\b(grab|uber|lyft)\b/i.exec(text)
  if (!brand?.[1]) return ""
  return brand[1].slice(0, 1).toUpperCase() + brand[1].slice(1).toLowerCase()
}

export function travelTitle(mode: TravelMode, from: string, to: string, carrier = ""): string {
  const origin = from.trim()
  const destination = to.trim()
  const brand = carrier.trim()
  if (mode === "flight") return origin && destination ? `Fly ${origin} to ${destination}` : ""
  if (mode === "train" || mode === "bus") {
    const word = mode === "train" ? "Train" : "Bus"
    if (origin && destination) return `${word} ${origin} → ${destination}`
    if (destination) return `${word} to ${destination}`
    if (origin) return `${word} from ${origin}`
    return ""
  }
  if (mode === "walk") {
    if (destination) return `Walk to ${destination}`
    if (origin) return `Walk from ${origin}`
    return ""
  }
  const word = brand || (mode === "shuttle" ? "Shuttle" : "Taxi")
  if (mode === "shuttle" && origin && destination && !brand) return `Shuttle ${origin} → ${destination}`
  if (destination) return `${word} to ${destination}`
  if (origin) return `${word} from ${origin}`
  return ""
}

export function groundRoute(text: string): { from: string; to: string } | null {
  const toOnly = /^(?:grab|uber|lyft|taxi|cab|shuttle|bus|train|walk)\s+to\s+(.+)$/i.exec(text.trim())
  if (toOnly?.[1]) return { from: "", to: toOnly[1].trim() }
  const both = /^(?:grab|uber|lyft|taxi|cab|shuttle|bus|train|walk)\s+(.+?)\s+to\s+(.+)$/i.exec(text.trim())
  if (both?.[1] && both[2]) return { from: both[1].trim(), to: both[2].trim() }
  return null
}
