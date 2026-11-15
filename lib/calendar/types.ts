export type CalendarKind = "flight" | "stay" | "place" | "note"

export type CalendarPlan = {
  id: string
  tripId: string
  kind: CalendarKind
  title: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  startTime?: string
  endTime?: string
  startTimeZone?: string
  endTimeZone?: string
  revision: number
  updatedAt: number
}

export type SourceItem = {
  id: string
  title: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  startTime?: string
  endTime?: string
  startTimeZone?: string
  endTimeZone?: string
  revision: number
  updatedAt: number
}

export type TripCalendarSource = {
  tripId: string
  tripName: string
  tripUpdatedAt: number
  items: SourceItem[]
  note: { content: string; updatedAt: number } | null
}
