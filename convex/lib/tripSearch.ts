export type TripStatusFilter = "active" | "archived"

export type SearchQuery = {
  date?: string
  place?: string
  status?: TripStatusFilter
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseSearchQuery(params: {
  date?: string | null
  place?: string | null
  status?: string | null
}): { ok: true; query: SearchQuery } | { ok: false; error: "status_is_trip_status" | "invalid_date" } {
  const date = params.date?.trim() || undefined
  const place = params.place?.trim() || undefined
  const status = params.status?.trim() || undefined
  if (status !== undefined && status !== "active" && status !== "archived") {
    return { ok: false, error: "status_is_trip_status" }
  }
  if (date !== undefined && !ISO_DATE.test(date)) {
    return { ok: false, error: "invalid_date" }
  }
  return {
    ok: true,
    query: {
      date,
      place,
      status,
    },
  }
}

export type SearchTrip = {
  id: string
  name: string
  startDate: string
  endDate: string
  archivedAt?: number
}

export type SearchItem = {
  tripId: string
  location: string
  locationTo?: string
  startDate: string
  endDate: string
}

function covers(start: string, end: string, date: string) {
  return start <= date && date <= end
}

export function searchTrips(
  trips: readonly SearchTrip[],
  items: readonly SearchItem[],
  query: SearchQuery,
): SearchTrip[] {
  const date = query.date?.trim() || undefined
  const place = query.place?.trim() || undefined
  const status = query.status
  if (!date && !place && !status) {
    return []
  }
  const placeFold = place?.toLocaleLowerCase()
  const itemsByTrip = new Map<string, SearchItem[]>()
  for (const item of items) {
    const list = itemsByTrip.get(item.tripId)
    if (list) {
      list.push(item)
    } else {
      itemsByTrip.set(item.tripId, [item])
    }
  }
  return trips.filter((trip) => {
    const archived = trip.archivedAt !== undefined
    if (archived !== (status === "archived")) {
      return false
    }
    const tripItems = itemsByTrip.get(trip.id) ?? []
    if (date && !covers(trip.startDate, trip.endDate, date) && !tripItems.some((item) => covers(item.startDate, item.endDate, date))) {
      return false
    }
    if (placeFold) {
      const hit = tripItems.some((item) => {
        return (
          item.location.toLocaleLowerCase() === placeFold ||
          item.locationTo?.toLocaleLowerCase() === placeFold
        )
      })
      if (!hit) {
        return false
      }
    }
    return true
  })
}
