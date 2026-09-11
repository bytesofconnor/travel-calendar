export function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function defaultTripDates(spanDays = 7) {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + spanDays)
  return {
    start: localIsoDate(start),
    end: localIsoDate(end),
  }
}

export function formatTripDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} to ${endDate}`
  }

  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${startLabel} – ${endLabel}`
}
