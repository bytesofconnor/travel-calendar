import type { TripItem } from "./kanban-store.ts"
import { resolvePlanType } from "./plan-form.ts"
import type { PlanKind } from "./trip-kind.ts"

function planKind(item: TripItem): PlanKind {
  return resolvePlanType(item)
}

export interface MonthDayCell {
  iso: string
  inMonth: boolean
}

export interface StayBar {
  id: string
  title: string
  kind: PlanKind
  start: number
  end: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

const KIND_ORDER: Record<PlanKind, number> = {
  flight: 0,
  stay: 1,
  place: 2,
  note: 3,
  ask: 4,
  now: 5,
}

export function itemsOnDay(items: TripItem[], iso: string) {
  return items
    .filter((item) => item.startDate <= iso && item.endDate >= iso)
    .sort((left, right) => {
      const kind = KIND_ORDER[planKind(left)] - KIND_ORDER[planKind(right)]
      if (kind !== 0) return kind
      return left.title.localeCompare(right.title)
    })
}

export function stayBarsForWeek(days: MonthDayCell[], items: TripItem[]): StayBar[] {
  if (days.length !== 7) return []
  const weekStart = days[0].iso
  const weekEnd = days[6].iso
  const segments = items
    .filter((item) => planKind(item) === "stay" && item.startDate <= weekEnd && item.endDate >= weekStart)
    .map((item) => {
      let start = 0
      let end = 6
      for (let index = 0; index < 7; index += 1) {
        if (days[index].iso >= item.startDate) {
          start = index
          break
        }
      }
      for (let index = 6; index >= 0; index -= 1) {
        if (days[index].iso <= item.endDate) {
          end = index
          break
        }
      }
      return {
        id: item.id,
        title: item.title,
        kind: "stay" as const,
        start,
        end,
        continuesBefore: item.startDate < weekStart,
        continuesAfter: item.endDate > weekEnd,
      }
    })
    .sort((left, right) => left.start - right.start || right.end - left.end || left.title.localeCompare(right.title))

  const laneEnds: number[] = []
  return segments.map((segment) => {
    let lane = laneEnds.findIndex((taken) => taken < segment.start)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(segment.end)
    } else {
      laneEnds[lane] = segment.end
    }
    return { ...segment, lane }
  })
}

export function tripEdges(days: Array<{ iso: string }>, index: number, tripStart: string, tripEnd: string) {
  const iso = days[index]?.iso ?? ""
  const inTrip = iso >= tripStart && iso <= tripEnd
  if (!inTrip) {
    return { inTrip: false, joinLeft: false, joinTop: false, edges: "" }
  }
  const onTrip = (offset: number) => {
    const day = days[index + offset]
    return Boolean(day && day.iso >= tripStart && day.iso <= tripEnd)
  }
  const joinLeft = index % 7 !== 0 && onTrip(-1)
  const joinRight = index % 7 !== 6 && onTrip(1)
  const joinTop = onTrip(-7)
  const joinBottom = onTrip(7)
  const edges = [
    joinTop ? "" : "top",
    joinRight ? "" : "right",
    joinBottom ? "" : "bottom",
    joinLeft ? "" : "left",
  ]
    .filter(Boolean)
    .join(" ")
  return { inTrip, joinLeft, joinTop, edges }
}
