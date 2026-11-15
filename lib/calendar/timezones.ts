type Zoned = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  offsetMin: number
}

type Transition = {
  at: number
  from: number
  to: number
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0")
}

export function formatUtc(ms: number): string {
  const date = new Date(ms)
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-"
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
}

function zoned(timeZone: string, utcMs: number): Zoned {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = Object.fromEntries(
    fmt
      .formatToParts(new Date(utcMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  let year = Number(parts.year)
  let month = Number(parts.month)
  let day = Number(parts.day)
  let hour = Number(parts.hour)
  const minute = Number(parts.minute)
  const second = Number(parts.second)
  if (hour === 24) {
    hour = 0
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear()
    month = next.getUTCMonth() + 1
    day = next.getUTCDate()
  }
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    offsetMin: Math.round((asUtc - utcMs) / 60000),
  }
}

function offsetAt(timeZone: string, utcMs: number): number {
  return zoned(timeZone, utcMs).offsetMin
}

function zoneName(timeZone: string, utcMs: number): string {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
  const name = fmt.formatToParts(new Date(utcMs)).find((part) => part.type === "timeZoneName")?.value
  return name && name.length <= 16 ? name : "LOCAL"
}

function localStamp(utcMs: number, offsetMin: number): string {
  const local = new Date(utcMs + offsetMin * 60000)
  return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}T${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}`
}

function transitions(timeZone: string, startMs: number, endMs: number): Transition[] {
  const found: Transition[] = []
  const step = 24 * 60 * 60 * 1000
  let prev = offsetAt(timeZone, startMs)
  for (let cursor = startMs + step; cursor <= endMs + step; cursor += step) {
    const next = offsetAt(timeZone, cursor)
    if (next === prev) continue
    let lo = cursor - step
    let hi = cursor
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2)
      if (offsetAt(timeZone, mid) === prev) lo = mid
      else hi = mid
    }
    found.push({ at: hi, from: prev, to: next })
    prev = next
  }
  return found
}

function block(kind: "STANDARD" | "DAYLIGHT", transition: Transition, timeZone: string): string {
  const name = zoneName(timeZone, transition.at + 60_000)
  return [
    `BEGIN:${kind}`,
    `DTSTART:${localStamp(transition.at, transition.from)}`,
    `TZOFFSETFROM:${formatOffset(transition.from)}`,
    `TZOFFSETTO:${formatOffset(transition.to)}`,
    `TZNAME:${name}`,
    `END:${kind}`,
  ].join("\r\n")
}

export function vtimezoneBlock(timeZone: string, windowStartMs: number, windowEndMs: number): string | null {
  let probe: number
  try {
    probe = offsetAt(timeZone, windowStartMs)
  } catch {
    return null
  }
  const scanFrom = windowStartMs - 370 * 24 * 60 * 60 * 1000
  const changes = transitions(timeZone, scanFrom, windowEndMs + 2 * 24 * 60 * 60 * 1000)
  const lines = [`BEGIN:VTIMEZONE`, `TZID:${timeZone}`]
  if (changes.length === 0) {
    const stamp = localStamp(windowStartMs - 24 * 60 * 60 * 1000, probe)
    lines.push(
      "BEGIN:STANDARD",
      `DTSTART:${stamp}`,
      `TZOFFSETFROM:${formatOffset(probe)}`,
      `TZOFFSETTO:${formatOffset(probe)}`,
      `TZNAME:${zoneName(timeZone, windowStartMs)}`,
      "END:STANDARD",
    )
  } else {
    for (const change of changes) {
      lines.push(block(change.to > change.from ? "DAYLIGHT" : "STANDARD", change, timeZone))
    }
  }
  lines.push("END:VTIMEZONE")
  return lines.join("\r\n")
}
