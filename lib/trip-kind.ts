import type { TripItem } from "@/lib/kanban-store"

export type PlanKind = "flight" | "stay" | "place" | "note" | "ask" | "now"

export function inferPlanKind(item: TripItem): PlanKind {
  if (item.locationTo?.trim()) return "flight"
  if (item.startDate !== item.endDate) return "stay"
  return "place"
}

export function kindLabel(kind: PlanKind): string {
  if (kind === "flight") return "Flight"
  if (kind === "stay") return "Stay"
  if (kind === "place") return "Place"
  if (kind === "note") return "Note"
  if (kind === "ask") return "Ask"
  return "Now"
}

export function formatChapterDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .replace(/,/g, " ·")
    .toUpperCase()
}

export function tripDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`).getTime()
  const end = new Date(`${endDate}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1
  return Math.round((end - start) / 86_400_000) + 1
}

export function isDateInTrip(today: string, startDate: string, endDate: string): boolean {
  return today >= startDate && today <= endDate
}

export function dayIndexInTrip(today: string, startDate: string): number {
  const start = new Date(`${startDate}T12:00:00`).getTime()
  const current = new Date(`${today}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(current)) return 1
  return Math.round((current - start) / 86_400_000) + 1
}

export function nextIsoDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function stayNights(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`).getTime()
  const end = new Date(`${endDate}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1
  return Math.round((end - start) / 86_400_000)
}

export function itemMetaLine(item: TripItem, kind: PlanKind): string {
  if (kind === "flight") {
    const from = item.location.trim()
    const to = item.locationTo?.trim()
    return [from && to ? `${from} → ${to}` : from || to, item.notes].filter(Boolean).join(" · ")
  }
  if (kind === "stay") {
    const nights = stayNights(item.startDate, item.endDate)
    return [item.location, `${nights} night${nights === 1 ? "" : "s"}`].filter(Boolean).join(" · ")
  }
  return [item.location, item.notes].filter(Boolean).join(" · ")
}

export function groupItemsByStartDate(items: TripItem[]): Array<{ date: string; items: TripItem[] }> {
  const map = new Map<string, TripItem[]>()
  for (const item of items) {
    const list = map.get(item.startDate) ?? []
    list.push(item)
    map.set(item.startDate, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      date,
      items: dayItems.sort((a, b) => a.title.localeCompare(b.title)),
    }))
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}
