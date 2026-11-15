export type CalendarApp = "apple" | "google" | "outlook"

const ORDER: CalendarApp[] = ["apple", "google", "outlook"]

export function preferredCalendar(input: {
  userAgent: string
  platform: string
  maxTouchPoints: number
}): CalendarApp {
  const ua = input.userAgent
  const ipad = input.platform === "MacIntel" && input.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || ipad) return "apple"
  if (/Android/i.test(ua)) return "google"
  if (/Mac/i.test(input.platform) || /Macintosh|Mac OS X/i.test(ua)) return "apple"
  if (/Win/i.test(input.platform) || /Windows/i.test(ua)) return "outlook"
  return "google"
}

export function calendarOrder(preferred: CalendarApp): CalendarApp[] {
  return [preferred, ...ORDER.filter((app) => app !== preferred)]
}

export function toWebcal(httpUrl: string): string {
  return httpUrl.replace(/^https?:\/\//, "webcal://")
}

export function subscribeLinks(httpsUrl: string, tripName: string) {
  const apple = toWebcal(httpsUrl)
  return {
    https: httpsUrl,
    apple,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(apple)}`,
    outlook: `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(tripName)}`,
  }
}

export const CALENDAR_LABELS: Record<CalendarApp, string> = {
  apple: "Apple Calendar",
  google: "Google Calendar",
  outlook: "Outlook",
}
