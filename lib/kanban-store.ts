import { create } from "zustand"

export type Location =
  | "lima"
  | "cusco"
  | "sacred-valley"
  | "machu-picchu"
  | "arequipa"
  | "colca-canyon"
  | "huacachina"
  | "puno"
  | "lake-titicaca"
  | "la-paz"
  | "uyuni"
  | "sucre"
  | "copacabana"
  | "santa-cruz"
  | "cochabamba"
  | "potosi"
  | "oruro"
  | "rurrenabaque"
  | "tupiza"
  | "tarija"
  | "samaipata"
  | "tiwanaku"
  | "coroico"
  | "trinidad"
  | "medellin"
  | "cartagena"
  | "washington-dc"
  | "minnesota"
  | "travel"

export type ViewMode = "week" | "month"

export interface Trip {
  id: string
  name: string
  inviteCode: string
  startDate: string
  endDate: string
  createdBy: string
  createdAt: string
  coverImageUrl?: string
  coverImagePhotographer?: string
  coverImageSourceUrl?: string
  coverImageQuery?: string
}

export interface TripMember {
  tripId: string
  userId: string
  role: "owner" | "editor"
  displayName: string
  email?: string | null
}

export interface TripItem {
  id: string
  tripId: string
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  location: Location
  locationTo?: Location
  createdBy: string
  createdAt: string
  updatedAt: string
  authorName?: string
}

export interface TripItemInput {
  title: string
  notes?: string
  link?: { label: string; url: string }
  startDate: string
  endDate: string
  location: Location
  locationTo?: Location
}

export const LOCATIONS: { id: Location; name: string; color: string; bgClass: string; borderClass: string }[] = [
  { id: "lima", name: "Lima", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500/40" },
  { id: "cusco", name: "Cusco", color: "#8b5cf6", bgClass: "bg-violet-500", borderClass: "border-violet-500/40" },
  { id: "sacred-valley", name: "Sacred Valley", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-500/40" },
  { id: "machu-picchu", name: "Machu Picchu", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-500/40" },
  { id: "arequipa", name: "Arequipa", color: "#ec4899", bgClass: "bg-pink-500", borderClass: "border-pink-500/40" },
  { id: "colca-canyon", name: "Colca Canyon", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500/40" },
  { id: "huacachina", name: "Huacachina", color: "#eab308", bgClass: "bg-yellow-500", borderClass: "border-yellow-500/40" },
  { id: "puno", name: "Puno", color: "#06b6d4", bgClass: "bg-cyan-500", borderClass: "border-cyan-500/40" },
  { id: "lake-titicaca", name: "Lake Titicaca", color: "#0ea5e9", bgClass: "bg-sky-500", borderClass: "border-sky-500/40" },
  { id: "la-paz", name: "La Paz", color: "#ef4444", bgClass: "bg-red-500", borderClass: "border-red-500/40" },
  { id: "uyuni", name: "Uyuni Salt Flats", color: "#f5f5f4", bgClass: "bg-stone-200", borderClass: "border-stone-400/40" },
  { id: "sucre", name: "Sucre", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500/40" },
  { id: "copacabana", name: "Copacabana", color: "#14b8a6", bgClass: "bg-teal-500", borderClass: "border-teal-500/40" },
  { id: "santa-cruz", name: "Santa Cruz", color: "#16a34a", bgClass: "bg-green-600", borderClass: "border-green-600/40" },
  { id: "cochabamba", name: "Cochabamba", color: "#d97706", bgClass: "bg-amber-600", borderClass: "border-amber-600/40" },
  { id: "potosi", name: "Potosi", color: "#b45309", bgClass: "bg-amber-700", borderClass: "border-amber-700/40" },
  { id: "oruro", name: "Oruro", color: "#be185d", bgClass: "bg-pink-700", borderClass: "border-pink-700/40" },
  { id: "rurrenabaque", name: "Rurrenabaque", color: "#15803d", bgClass: "bg-green-700", borderClass: "border-green-700/40" },
  { id: "tupiza", name: "Tupiza", color: "#b91c1c", bgClass: "bg-red-700", borderClass: "border-red-700/40" },
  { id: "tarija", name: "Tarija", color: "#a16207", bgClass: "bg-yellow-700", borderClass: "border-yellow-700/40" },
  { id: "samaipata", name: "Samaipata", color: "#0f766e", bgClass: "bg-teal-700", borderClass: "border-teal-700/40" },
  { id: "tiwanaku", name: "Tiwanaku", color: "#1d4ed8", bgClass: "bg-blue-700", borderClass: "border-blue-700/40" },
  { id: "coroico", name: "Coroico", color: "#4d7c0f", bgClass: "bg-lime-700", borderClass: "border-lime-700/40" },
  { id: "trinidad", name: "Trinidad", color: "#c2410c", bgClass: "bg-orange-700", borderClass: "border-orange-700/40" },
  { id: "medellin", name: "Medellin", color: "#7c3aed", bgClass: "bg-violet-600", borderClass: "border-violet-600/40" },
  { id: "cartagena", name: "Cartagena", color: "#db2777", bgClass: "bg-pink-600", borderClass: "border-pink-600/40" },
  { id: "washington-dc", name: "Washington DC", color: "#dc2626", bgClass: "bg-red-600", borderClass: "border-red-600/40" },
  { id: "minnesota", name: "Minnesota", color: "#7c3aed", bgClass: "bg-violet-700", borderClass: "border-violet-700/40" },
  { id: "travel", name: "Travel/Transit", color: "#6b7280", bgClass: "bg-gray-500", borderClass: "border-gray-500/40" },
]

export const DEFAULT_TRIP_NAME = "Peru & Bolivia 2026"
export const DEFAULT_TRIP_START = "2026-04-27"
export const DEFAULT_TRIP_END = "2026-06-30"

interface CalendarUiStore {
  currentWeekStart: string
  currentMonth: string
  viewMode: ViewMode
  tripStart: string
  tripEnd: string
  initializeForTrip: (startDate: string, endDate: string) => void
  setCurrentWeek: (date: string) => void
  setCurrentMonth: (month: string) => void
  setViewMode: (mode: ViewMode) => void
  nextWeek: () => void
  prevWeek: () => void
  nextMonth: () => void
  prevMonth: () => void
}

export function getLocationById(id: Location) {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0]
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTodayString() {
  return formatDate(new Date())
}

export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  const day = date.getDay()
  const diff = date.getDate() - day
  const weekStart = new Date(date)
  weekStart.setDate(diff)
  return formatDate(weekStart)
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00")
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

export function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function getDaysInWeek(weekStart: string): { date: string; dayName: string; dayNum: number; month: string }[] {
  const days: { date: string; dayName: string; dayNum: number; month: string }[] = []
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index)
    const day = new Date(date + "T12:00:00")
    days.push({
      date,
      dayName: dayNames[day.getDay()],
      dayNum: day.getDate(),
      month: day.toLocaleDateString("en-US", { month: "short" }),
    })
  }

  return days
}

export function getDaysInMonth(monthStr: string): { date: string; dayNum: number; isCurrentMonth: boolean }[] {
  const [year, month] = monthStr.split("-").map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPadding = firstDay.getDay()
  const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = []

  for (let index = startPadding - 1; index >= 0; index -= 1) {
    const day = new Date(year, month - 1, -index)
    days.push({
      date: formatDate(day),
      dayNum: day.getDate(),
      isCurrentMonth: false,
    })
  }

  for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum += 1) {
    const day = new Date(year, month - 1, dayNum)
    days.push({
      date: formatDate(day),
      dayNum,
      isCurrentMonth: true,
    })
  }

  const remaining = 42 - days.length
  for (let dayNum = 1; dayNum <= remaining; dayNum += 1) {
    const day = new Date(year, month, dayNum)
    days.push({
      date: formatDate(day),
      dayNum,
      isCurrentMonth: false,
    })
  }

  return days
}

export function getItemsForWeek(items: TripItem[], weekStart: string): TripItem[] {
  const weekEnd = addDays(weekStart, 6)
  return items.filter((item) => item.startDate <= weekEnd && item.endDate >= weekStart)
}

export function getItemsForDate(items: TripItem[], date: string): TripItem[] {
  return items.filter((item) => item.startDate <= date && item.endDate >= date)
}

export function generateICS(items: TripItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shared Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const item of items) {
    const startDate = item.startDate.replace(/-/g, "")
    const endDate = addDays(item.endDate, 1).replace(/-/g, "")
    const location = getLocationById(item.location)
    const locationName = item.locationTo
      ? `${location.name} to ${getLocationById(item.locationTo).name}`
      : location.name

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@shared-trip-calendar`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${item.title}`,
      `LOCATION:${locationName}`,
      item.notes ? `DESCRIPTION:${item.notes.replace(/\n/g, "\\n")}` : "",
      item.link ? `URL:${item.link.url}` : "",
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")
  return lines.filter(Boolean).join("\r\n")
}

export function mapMembersByUserId(members: TripMember[]) {
  return new Map(members.map((member) => [member.userId, member]))
}

export function withAuthorNames(items: TripItem[], members: TripMember[]) {
  const membersById = mapMembersByUserId(members)
  return items.map((item) => ({
    ...item,
    authorName: membersById.get(item.createdBy)?.displayName ?? item.authorName,
  }))
}

export const useCalendarStore = create<CalendarUiStore>()((set, get) => ({
  currentWeekStart: getWeekStart(DEFAULT_TRIP_START),
  currentMonth: getMonthStart(DEFAULT_TRIP_START),
  viewMode: "week",
  tripStart: DEFAULT_TRIP_START,
  tripEnd: DEFAULT_TRIP_END,

  initializeForTrip: (startDate, endDate) =>
    set((state) => {
      const normalizedWeek = getWeekStart(startDate)
      const nextState: Partial<CalendarUiStore> = {
        tripStart: startDate,
        tripEnd: endDate,
      }

      if (state.currentWeekStart < getWeekStart(startDate) || state.currentWeekStart > getWeekStart(endDate)) {
        nextState.currentWeekStart = normalizedWeek
      }

      if (state.currentMonth < getMonthStart(startDate) || state.currentMonth > getMonthStart(endDate)) {
        nextState.currentMonth = getMonthStart(startDate)
      }

      return nextState as CalendarUiStore
    }),

  setCurrentWeek: (date) =>
    set({
      currentWeekStart: getWeekStart(date),
      currentMonth: getMonthStart(date),
    }),

  setCurrentMonth: (month) => set({ currentMonth: month }),
  setViewMode: (mode) => set({ viewMode: mode }),

  nextWeek: () => {
    const current = get().currentWeekStart
    const next = addDays(current, 7)
    const tripEndWeek = getWeekStart(get().tripEnd)
    if (next <= tripEndWeek) {
      set({
        currentWeekStart: next,
        currentMonth: getMonthStart(next),
      })
    }
  },

  prevWeek: () => {
    const current = get().currentWeekStart
    const previous = addDays(current, -7)
    const tripStartWeek = getWeekStart(get().tripStart)
    if (previous >= tripStartWeek) {
      set({
        currentWeekStart: previous,
        currentMonth: getMonthStart(previous),
      })
    }
  },

  nextMonth: () => {
    const [year, month] = get().currentMonth.split("-").map(Number)
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`
    const maxMonth = getMonthStart(get().tripEnd)
    if (nextMonth <= maxMonth) {
      set({ currentMonth: nextMonth })
    }
  },

  prevMonth: () => {
    const [year, month] = get().currentMonth.split("-").map(Number)
    const previousMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`
    const minMonth = getMonthStart(get().tripStart)
    if (previousMonth >= minMonth) {
      set({ currentMonth: previousMonth })
    }
  },
}))
