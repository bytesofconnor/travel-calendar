"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarPlus, Check, Loader2, NotebookPen, RotateCcw, Sparkles, WandSparkles } from "lucide-react"

import { ItemDialog } from "@/components/item-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { COUNTRIES, type Location, type TripItem, type TripItemInput, type TripPackingItem } from "@/lib/kanban-store"

type CopilotMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  brainstormBullets?: string[]
  packingSuggestions?: string[]
  caution?: string | null
}

interface TripCopilotProps {
  mode: "panel" | "drawer-trigger"
  tripName: string
  tripStart: string
  tripEnd: string
  noteDraft: string
  items: TripItem[]
  packingItems: TripPackingItem[]
  onDraftChange: (value: string) => void
  onSaveToBrainstorm: (content: string) => Promise<void>
  onAddPackingIdeas: (labels: string[]) => Promise<void> | void
  onAddCalendarItem: (input: TripItemInput) => Promise<void> | void
  currentUserName?: string
  isMutating?: boolean
}

function appendBlock(existing: string, addition: string) {
  const trimmedExisting = existing.trimEnd()
  const trimmedAddition = addition.trim()

  if (!trimmedAddition) {
    return existing
  }

  return trimmedExisting ? `${trimmedExisting}\n\n${trimmedAddition}` : trimmedAddition
}

type ParsedCalendarCandidate = TripItemInput & {
  confidence: number
  key: string
  sourceLine: string
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

const CALENDAR_STOPWORDS = new Set([
  "confirm",
  "check",
  "look",
  "verify",
  "research",
  "book",
  "decide",
  "consider",
  "maybe",
])

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizeCalendarKey(value: string) {
  return normalizeText(value)
}

const locationAliases = COUNTRIES.flatMap((country) =>
  country.locations.flatMap((location) => {
    const aliases = new Set<string>([
      location.name,
      location.id.replace(/-/g, " "),
    ])

    if (location.id === "uyuni") {
      aliases.add("uyuni salt flats")
      aliases.add("salar de uyuni")
      aliases.add("salt flats")
    }

    if (location.id === "la-paz") {
      aliases.add("la paz bolivia")
    }

    return [...aliases].map((alias) => ({
      alias: normalizeText(alias),
      locationId: location.id,
    }))
  }),
).sort((left, right) => right.alias.length - left.alias.length)

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function clampDateToTrip(date: string, tripStart: string, tripEnd: string) {
  if (date < tripStart) {
    return tripStart
  }
  if (date > tripEnd) {
    return tripEnd
  }
  return date
}

function parseDateRange(text: string, tripStart: string, tripEnd: string) {
  const match = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?(?::|\b)/)
  if (!match) {
    return null
  }

  const [, monthRaw, startDayRaw, endDayRaw] = match
  const month = MONTHS[monthRaw.toLowerCase()]
  if (!month) {
    return null
  }

  const year = Number(tripStart.slice(0, 4))
  const startDay = Number(startDayRaw)
  const endDay = endDayRaw ? Number(endDayRaw) : startDay
  const startDate = clampDateToTrip(toDateString(year, month, startDay), tripStart, tripEnd)
  const endDate = clampDateToTrip(toDateString(year, month, endDay), tripStart, tripEnd)

  return {
    startDate,
    endDate: endDate >= startDate ? endDate : startDate,
  }
}

function extractLocations(text: string) {
  const normalized = normalizeText(text)
  const matches: Location[] = []

  for (const entry of locationAliases) {
    const haystack = ` ${normalized} `
    const needle = ` ${entry.alias} `
    if (!haystack.includes(needle)) {
      continue
    }

    if (!matches.includes(entry.locationId)) {
      matches.push(entry.locationId)
    }
  }

  return matches
}

function inferTransitLocations(text: string, matches: Location[]) {
  const lowered = text.toLowerCase().replace(/[–—]/g, "-")
  const transitMatch = lowered.match(/\b(?:bus|train|flight|fly|drive|ferry|jeep tour|jeep|travel|transit|overnight bus)\b/)
  const routeMatch = lowered.match(/\b(?:from\s+)?(.+?)\s+(?:to|->|→)\s+(.+?)(?:$|,|\(|for)/)

  if (!transitMatch || !routeMatch || matches.length < 2) {
    return null
  }

  const left = extractLocations(routeMatch[1])[0]
  const right = extractLocations(routeMatch[2])[0]

  if (!left || !right || left === right) {
    return null
  }

  return { location: left, locationTo: right }
}

function buildCalendarCandidate(
  line: string,
  tripStart: string,
  tripEnd: string,
  fallbackLocation: Location,
): ParsedCalendarCandidate | null {
  const cleanedLine = line.replace(/^[-•]\s*/, "").trim()
  if (!cleanedLine) {
    return null
  }

  const lowerTokens = normalizeText(cleanedLine).split(" ")
  if (lowerTokens.some((token) => CALENDAR_STOPWORDS.has(token)) && !cleanedLine.match(/\b(?:bus|train|flight|tour|explore|stay|rest|hike|visit)\b/i)) {
    return null
  }

  const parsedDates = parseDateRange(cleanedLine, tripStart, tripEnd)
  const lineWithoutDate = cleanedLine.replace(/^[A-Za-z]{3,9}\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?:\s*/, "").trim()
  const locationMatches = extractLocations(cleanedLine)
  const transit = inferTransitLocations(cleanedLine, locationMatches)
  const primaryLocation = transit?.location ?? locationMatches[0] ?? fallbackLocation
  const secondaryLocation = transit?.locationTo

  const title = (lineWithoutDate || cleanedLine).replace(/\s+/g, " ").trim()
  if (!title) {
    return null
  }

  let confidence = 0
  if (parsedDates) confidence += 3
  if (locationMatches.length > 0) confidence += 3
  if (secondaryLocation) confidence += 2
  if (/\b(?:bus|train|flight|tour|explore|stay|rest|hike|visit|museum|market|trek|ride)\b/i.test(cleanedLine)) confidence += 1

  return {
    key: `${title.slice(0, 120)}|${parsedDates?.startDate ?? tripStart}|${parsedDates?.endDate ?? parsedDates?.startDate ?? tripStart}|${primaryLocation}|${secondaryLocation ?? ""}`,
    sourceLine: cleanedLine,
    title: title.slice(0, 120),
    notes: cleanedLine,
    startDate: parsedDates?.startDate ?? tripStart,
    endDate: parsedDates?.endDate ?? parsedDates?.startDate ?? tripStart,
    location: primaryLocation,
    locationTo: secondaryLocation,
    confidence,
  }
}

function dedupeCalendarCandidates(candidates: ParsedCalendarCandidate[]) {
  return candidates.filter((candidate, index, array) => {
    const normalizedTitle = normalizeCalendarKey(candidate.title)

    return (
      array.findIndex((entry) => {
        const sameDates = entry.startDate === candidate.startDate && entry.endDate === candidate.endDate
        const sameRoute = entry.location === candidate.location && entry.locationTo === candidate.locationTo
        const sameTitle = normalizeCalendarKey(entry.title) === normalizedTitle

        return sameDates && sameRoute && sameTitle
      }) === index
    )
  })
}

interface CopilotPanelProps {
  mobile?: boolean
  promptSuggestions: string[]
  aiInput: string
  setAiInput: (value: string) => void
  aiMessages: CopilotMessage[]
  isAskingAi: boolean
  aiError: string
  onAskAi: (prompt?: string) => Promise<void> | void
  onSaveToBrainstorm: (message: CopilotMessage) => Promise<void> | void
  onAddPackingIdeas: (message: CopilotMessage) => Promise<void> | void
  onStartAddToCalendar: (message: CopilotMessage) => void
  onClearConversation: () => void
  brainstormStatusByMessage: Record<string, "idle" | "saving" | "saved" | "error">
  packingStatusByMessage: Record<string, "idle" | "saving" | "saved" | "error">
  calendarStatusByMessage: Record<string, "idle" | "editing" | "saving" | "saved" | "error">
}

function CopilotPanel({
  mobile = false,
  promptSuggestions,
  aiInput,
  setAiInput,
  aiMessages,
  isAskingAi,
  aiError,
  onAskAi,
  onSaveToBrainstorm,
  onAddPackingIdeas,
  onStartAddToCalendar,
  onClearConversation,
  brainstormStatusByMessage,
  packingStatusByMessage,
  calendarStatusByMessage,
}: CopilotPanelProps) {
  const latestMessages = aiMessages.slice(-8)
  const visiblePrompts = latestMessages.length > 0 ? promptSuggestions.slice(0, 2) : promptSuggestions
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = messagesRef.current
    if (!node) {
      return
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    })
  }, [latestMessages.length, isAskingAi])

  return (
    <div
      className={`flex flex-col rounded-[18px] border border-border/80 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur ${
        mobile ? "" : "h-full min-h-0"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Trip Copilot
        </div>
        {latestMessages.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearConversation}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">Ask about the trip</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Ask for must-dos, foods, logistics, route ideas, or what else you should pack.
      </p>

      <div className={`mt-4 flex flex-wrap gap-2 ${latestMessages.length > 0 ? "opacity-85" : ""}`}>
        {visiblePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void onAskAi(prompt)}
            className={`rounded-full border border-border/70 bg-secondary/35 px-3 py-2 text-left text-xs leading-5 text-muted-foreground transition-colors hover:bg-secondary/55 hover:text-foreground ${
              latestMessages.length > 0 ? "py-1.5" : ""
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={messagesRef} className={`mt-4 min-h-0 flex-1 overflow-y-auto pr-1 ${mobile ? "pb-3" : ""}`}>
        {latestMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 px-4 py-6">
            <div className="text-sm font-medium text-foreground">Start with a simple question</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Try asking for Bolivia highlights, Peru food recommendations, route advice, or packing suggestions for altitude.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {latestMessages.map((message) => {
              const brainstormStatus = brainstormStatusByMessage[message.id] ?? "idle"
              const packingStatus = packingStatusByMessage[message.id] ?? "idle"
              const calendarStatus = calendarStatusByMessage[message.id] ?? "idle"
              const canAddToCalendar =
                message.role === "assistant" && (Boolean(message.brainstormBullets?.length) || Boolean(message.content.trim()))

              return (
                <div
                  key={message.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    message.role === "user" ? "border-primary/30 bg-primary/10" : "border-border/70 bg-secondary/25"
                  }`}
                >
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {message.role === "user" ? "You asked" : "Trip Copilot"}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{message.content}</div>

                  {message.role === "assistant" && message.brainstormBullets && message.brainstormBullets.length > 0 ? (
                    <div className="mt-4">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Worth saving</div>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                        {message.brainstormBullets.map((bullet) => (
                          <li key={bullet}>• {bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.packingSuggestions && message.packingSuggestions.length > 0 ? (
                    <div className="mt-4">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Packing ideas</div>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                        {message.packingSuggestions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.caution ? (
                    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-xs leading-5 text-amber-100/85">
                      {message.caution}
                    </div>
                  ) : null}

                  {message.role === "assistant" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant={brainstormStatus === "saved" ? "outline" : "secondary"}
                        size="sm"
                        className="rounded-xl"
                        disabled={brainstormStatus === "saving" || brainstormStatus === "saved"}
                        onClick={() => void onSaveToBrainstorm(message)}
                      >
                        {brainstormStatus === "saving" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : brainstormStatus === "saved" ? (
                          <Check className="mr-2 h-4 w-4 text-emerald-300" />
                        ) : (
                          <NotebookPen className="mr-2 h-4 w-4" />
                        )}
                        {brainstormStatus === "saving"
                          ? "Adding…"
                          : brainstormStatus === "saved"
                            ? "Added to Brainstorm"
                            : brainstormStatus === "error"
                              ? "Try Add to Brainstorm Again"
                              : "Add to Brainstorm"}
                      </Button>
                      {canAddToCalendar ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={calendarStatus === "saving" || calendarStatus === "saved"}
                          onClick={() => onStartAddToCalendar(message)}
                        >
                          {calendarStatus === "saving" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : calendarStatus === "saved" ? (
                            <Check className="mr-2 h-4 w-4 text-emerald-300" />
                          ) : (
                            <CalendarPlus className="mr-2 h-4 w-4" />
                          )}
                          {calendarStatus === "editing"
                            ? "Finish calendar details"
                            : calendarStatus === "saving"
                              ? "Adding to Calendar…"
                              : calendarStatus === "saved"
                                ? "Added to Calendar"
                                : calendarStatus === "error"
                                  ? "Try Add to Calendar Again"
                                  : "Add to Calendar"}
                        </Button>
                      ) : null}
                      {message.packingSuggestions && message.packingSuggestions.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={packingStatus === "saving" || packingStatus === "saved"}
                          onClick={() => void onAddPackingIdeas(message)}
                        >
                          {packingStatus === "saving" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          {packingStatus === "saving"
                            ? "Adding packing ideas…"
                            : packingStatus === "saved"
                              ? "Added packing ideas"
                              : packingStatus === "error"
                                ? "Try Add packing ideas Again"
                                : "Add packing ideas"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={
          mobile
            ? "sticky bottom-0 mt-4 -mx-4 border-t border-border/70 bg-background/95 px-4 pb-1 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            : "mt-4 border-t border-border/60 pt-4"
        }
      >
        {aiError ? <div className="mb-3 text-sm text-rose-300">{aiError}</div> : null}

        <div className="flex flex-col gap-2">
          <Input
            value={aiInput}
            onChange={(event) => setAiInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void onAskAi()
              }
            }}
            placeholder="Ask about Bolivia, altitude, routes, food, or what to pack…"
            className="h-12 rounded-[16px] border-border/80 bg-background/50 text-base"
          />
          <Button className="h-12 rounded-[16px] text-base" onClick={() => void onAskAi()} disabled={isAskingAi || !aiInput.trim()}>
            {isAskingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
            Ask Trip Copilot
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TripCopilot({
  mode,
  tripName,
  tripStart,
  tripEnd,
  noteDraft,
  items,
  packingItems,
  onDraftChange,
  onSaveToBrainstorm,
  onAddPackingIdeas,
  onAddCalendarItem,
  currentUserName,
  isMutating = false,
}: TripCopilotProps) {
  const [aiInput, setAiInput] = useState("")
  const [aiMessages, setAiMessages] = useState<CopilotMessage[]>([])
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [aiError, setAiError] = useState("")
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false)
  const [brainstormStatusByMessage, setBrainstormStatusByMessage] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({})
  const [packingStatusByMessage, setPackingStatusByMessage] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({})
  const [calendarStatusByMessage, setCalendarStatusByMessage] = useState<Record<string, "idle" | "editing" | "saving" | "saved" | "error">>({})
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const [calendarDraft, setCalendarDraft] = useState<TripItemInput | null>(null)
  const [calendarMessageId, setCalendarMessageId] = useState<string | null>(null)
  const [calendarCandidates, setCalendarCandidates] = useState<ParsedCalendarCandidate[]>([])
  const [calendarImportDialogOpen, setCalendarImportDialogOpen] = useState(false)
  const [selectedCalendarCandidateKeys, setSelectedCalendarCandidateKeys] = useState<string[]>([])
  const calendarImportTransitionRef = useRef(false)

  const destinationLabel = useMemo(() => {
    const cleaned = tripName.replace(/\b20\d{2}\b/g, "").replace(/\s+/g, " ").trim()
    return cleaned || tripName
  }, [tripName])

  const promptSuggestions = useMemo(
    () => [
      `What are the best must-do experiences for ${destinationLabel}?`,
      `What foods and drinks should we make sure to try on this trip?`,
      `What should we pack for weather, altitude, and transit days?`,
      `What are some under-the-radar stops that fit this trip?`,
    ],
    [destinationLabel],
  )

  const conversationStorageKey = useMemo(
    () => `travel-calendar:copilot:${tripName}:${tripStart}:${tripEnd}`,
    [tripEnd, tripName, tripStart],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const raw = window.localStorage.getItem(conversationStorageKey)
      if (!raw) {
        setAiMessages([])
        return
      }

      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) {
        setAiMessages([])
        return
      }

      const nextMessages = parsed
        .filter((message): message is CopilotMessage => {
          if (!message || typeof message !== "object") {
            return false
          }

          const candidate = message as Partial<CopilotMessage>
          return typeof candidate.id === "string" && (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string"
        })
        .slice(-12)

      setAiMessages(nextMessages)
    } catch {
      setAiMessages([])
    }
  }, [conversationStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (aiMessages.length === 0) {
      window.localStorage.removeItem(conversationStorageKey)
      return
    }

    window.localStorage.setItem(conversationStorageKey, JSON.stringify(aiMessages.slice(-12)))
  }, [aiMessages, conversationStorageKey])

  async function addAssistantPackingIdeas(message: CopilotMessage) {
    if (!message.packingSuggestions || message.packingSuggestions.length === 0) {
      return
    }

    setPackingStatusByMessage((current) => ({ ...current, [message.id]: "saving" }))

    try {
      await onAddPackingIdeas(message.packingSuggestions)
      setPackingStatusByMessage((current) => ({ ...current, [message.id]: "saved" }))
    } catch {
      setPackingStatusByMessage((current) => ({ ...current, [message.id]: "error" }))
    }
  }

  async function handleSaveAssistantMessageToBrainstorm(message: CopilotMessage) {
    const additions = [message.content]

    if (message.brainstormBullets && message.brainstormBullets.length > 0) {
      additions.push(...message.brainstormBullets.map((bullet) => `- ${bullet}`))
    }

    const nextContent = appendBlock(noteDraft, additions.join("\n"))

    setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "saving" }))
    onDraftChange(nextContent)

    try {
      await onSaveToBrainstorm(nextContent)
      setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "saved" }))
    } catch {
      setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "error" }))
    }
  }

  function buildCalendarCandidates(message: CopilotMessage) {
    const inferredCountry =
      COUNTRIES.find((country) => new RegExp(`\\b${country.name.replace(/\s+/g, "\\s+")}\\b`, "i").test(tripName)) ?? null
    const fallbackLocation = items[0]?.location ?? inferredCountry?.locations[0]?.id ?? COUNTRIES[0]?.locations[0]?.id ?? ""
    const bulletLines = (message.brainstormBullets ?? []).map((line) => line.trim()).filter(Boolean)
    const contentLines = message.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        if (bulletLines.length > 0) {
          return false
        }

        if (line.length > 140) {
          return false
        }

        return /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(line)
      })

    const candidateLines = bulletLines.length > 0 ? bulletLines : contentLines

    const parsedCandidates = dedupeCalendarCandidates(
      candidateLines
        .map((line) => buildCalendarCandidate(line, tripStart, tripEnd, fallbackLocation))
        .filter((candidate): candidate is ParsedCalendarCandidate => Boolean(candidate))
        .sort((left, right) => {
          if (left.startDate !== right.startDate) {
            return left.startDate.localeCompare(right.startDate)
          }
          return right.confidence - left.confidence
        }),
    )

    if (parsedCandidates.length > 0) {
      return parsedCandidates
    }

    const sentenceTitle = message.content
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .find(Boolean)

    return [
      {
        key: `fallback|${message.id}`,
        sourceLine: sentenceTitle ?? "Trip idea",
        title: (sentenceTitle ?? "Trip idea").replace(/^[-•]\s*/, "").slice(0, 120),
        notes: sentenceTitle ?? undefined,
        startDate: tripStart,
        endDate: tripStart <= tripEnd ? tripStart : tripEnd,
        location: fallbackLocation,
        confidence: 0,
      },
    ]
  }

  function handleStartAddToCalendar(message: CopilotMessage) {
    const candidates = buildCalendarCandidates(message)
    setCalendarCandidates(candidates)
    setSelectedCalendarCandidateKeys(candidates.map((candidate) => candidate.key))
    setCalendarMessageId(message.id)
    setCalendarStatusByMessage((current) => ({ ...current, [message.id]: "editing" }))

    if (candidates.length > 1) {
      setCalendarImportDialogOpen(true)
      setCalendarDraft(null)
      return
    }

    setCalendarDraft(candidates[0] ?? null)
    setCalendarDialogOpen(true)
  }

  function handleEditCalendarCandidate(candidate: ParsedCalendarCandidate) {
    calendarImportTransitionRef.current = true
    setCalendarImportDialogOpen(false)
    setCalendarDraft({
      title: candidate.title,
      notes: candidate.notes,
      startDate: candidate.startDate,
      endDate: candidate.endDate,
      location: candidate.location,
      locationTo: candidate.locationTo,
    })
    setCalendarDialogOpen(true)
  }

  function resetCalendarImportState() {
    if (calendarMessageId) {
      setCalendarStatusByMessage((current) => ({
        ...current,
        [calendarMessageId]: current[calendarMessageId] === "editing" ? "idle" : current[calendarMessageId],
      }))
    }
    setCalendarCandidates([])
    setSelectedCalendarCandidateKeys([])
    setCalendarMessageId(null)
  }

  function toggleCalendarCandidateSelection(candidateKey: string, nextChecked: boolean) {
    setSelectedCalendarCandidateKeys((current) =>
      nextChecked ? [...current, candidateKey] : current.filter((key) => key !== candidateKey),
    )
  }

  async function handleAddAllCalendarCandidates() {
    const selectedCandidates = calendarCandidates.filter((candidate) => selectedCalendarCandidateKeys.includes(candidate.key))

    if (!calendarMessageId || selectedCandidates.length === 0) {
      return
    }

    setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "saving" }))

    try {
      for (const candidate of selectedCandidates) {
        await onAddCalendarItem({
          title: candidate.title,
          notes: candidate.notes,
          startDate: candidate.startDate,
          endDate: candidate.endDate,
          location: candidate.location,
          locationTo: candidate.locationTo,
        })
      }

      setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "saved" }))
      setCalendarImportDialogOpen(false)
      setCalendarCandidates([])
      setSelectedCalendarCandidateKeys([])
      setCalendarMessageId(null)
    } catch {
      setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "error" }))
    }
  }

  async function handleSaveCalendarDraft(input: TripItemInput) {
    if (!calendarMessageId) {
      return
    }

    setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "saving" }))

    try {
      await onAddCalendarItem(input)
      const remainingCandidates = calendarCandidates.filter(
        (candidate) =>
          !(
            candidate.title === input.title &&
            candidate.startDate === input.startDate &&
            candidate.endDate === input.endDate &&
            candidate.location === input.location &&
            candidate.locationTo === input.locationTo
          ),
      )

      setCalendarCandidates(remainingCandidates)
      setSelectedCalendarCandidateKeys((current) => current.filter((key) => remainingCandidates.some((candidate) => candidate.key === key)))
      setCalendarStatusByMessage((current) => ({
        ...current,
        [calendarMessageId]: remainingCandidates.length > 0 ? "editing" : "saved",
      }))
      setCalendarDialogOpen(false)
      setCalendarDraft(null)
      if (remainingCandidates.length > 0) {
        setCalendarImportDialogOpen(true)
      } else {
        setCalendarMessageId(null)
      }
    } catch {
      setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "error" }))
      throw new Error("Unable to add calendar item.")
    }
  }

  function handleCalendarDialogChange(open: boolean) {
    const activeMessageId = calendarMessageId
    const activeStatus = activeMessageId ? calendarStatusByMessage[activeMessageId] : "idle"

    setCalendarDialogOpen(open)
    if (!open && activeMessageId) {
      setCalendarStatusByMessage((current) => ({
        ...current,
        [activeMessageId]: current[activeMessageId] === "editing" ? "idle" : current[activeMessageId],
      }))
      if (activeStatus !== "saved") {
        setCalendarDraft(null)
      }
      if (calendarCandidates.length > 0 && activeStatus !== "saved") {
        setCalendarImportDialogOpen(true)
      } else {
        setCalendarMessageId(null)
      }
    }
  }

  async function handleAskAi(promptOverride?: string) {
    const prompt = (promptOverride ?? aiInput).trim()
    if (!prompt || isAskingAi) {
      return
    }

    setAiError("")
    setIsAskingAi(true)

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    }

    setAiMessages((current) => [...current, userMessage])
    if (!promptOverride) {
      setAiInput("")
    }

    try {
      const response = await fetch("/api/brainstorm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          history: aiMessages.slice(-10).map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
          trip: {
            name: tripName,
            startDate: tripStart,
            endDate: tripEnd,
          },
          noteDraft,
          items: items.map((item) => ({
            title: item.title,
            startDate: item.startDate,
            endDate: item.endDate,
            location: item.location,
            locationTo: item.locationTo,
          })),
          packingItems: packingItems.map((item) => ({
            label: item.label,
            isChecked: item.isChecked,
          })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            answer?: string
            brainstormBullets?: string[]
            packingSuggestions?: string[]
            caution?: string | null
            error?: string
          }
        | null

      const answer = typeof payload?.answer === "string" ? payload.answer.trim() : ""
      const brainstormBullets = Array.isArray(payload?.brainstormBullets)
        ? payload.brainstormBullets.filter((value): value is string => typeof value === "string")
        : []
      const packingSuggestions = Array.isArray(payload?.packingSuggestions)
        ? payload.packingSuggestions.filter((value): value is string => typeof value === "string")
        : []
      const caution = typeof payload?.caution === "string" ? payload.caution : null

      if (!response.ok || !answer) {
        throw new Error(payload?.error ?? "Trip Copilot couldn’t answer that yet.")
      }

      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          brainstormBullets,
          packingSuggestions,
          caution,
        },
      ])
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Trip Copilot couldn’t answer that yet.")
    } finally {
      setIsAskingAi(false)
    }
  }

  function handleClearConversation() {
    setAiMessages([])
    setAiError("")
    setBrainstormStatusByMessage({})
    setPackingStatusByMessage({})
    setCalendarStatusByMessage({})
  }

  const panel = (
    <CopilotPanel
      promptSuggestions={promptSuggestions}
      aiInput={aiInput}
      setAiInput={setAiInput}
      aiMessages={aiMessages}
      isAskingAi={isAskingAi}
      aiError={aiError}
      onAskAi={handleAskAi}
      onSaveToBrainstorm={handleSaveAssistantMessageToBrainstorm}
      onAddPackingIdeas={addAssistantPackingIdeas}
      onStartAddToCalendar={handleStartAddToCalendar}
      onClearConversation={handleClearConversation}
      brainstormStatusByMessage={brainstormStatusByMessage}
      packingStatusByMessage={packingStatusByMessage}
      calendarStatusByMessage={calendarStatusByMessage}
    />
  )

  return (
    <>
      {mode === "panel" ? (
        panel
      ) : (
        <>
          <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => setMobileCopilotOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Ask AI
          </Button>

          <Drawer open={mobileCopilotOpen} onOpenChange={setMobileCopilotOpen}>
            <DrawerContent className="h-[84vh] max-h-[84vh] rounded-t-[24px] border-border bg-background/95 backdrop-blur">
              <DrawerHeader className="text-left">
                <DrawerTitle>Trip Copilot</DrawerTitle>
                <DrawerDescription>Ask about food, route ideas, logistics, and what you should pack.</DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <CopilotPanel
                  mobile
                  promptSuggestions={promptSuggestions}
                  aiInput={aiInput}
                  setAiInput={setAiInput}
                  aiMessages={aiMessages}
                  isAskingAi={isAskingAi}
                  aiError={aiError}
                  onAskAi={handleAskAi}
                  onSaveToBrainstorm={handleSaveAssistantMessageToBrainstorm}
                  onAddPackingIdeas={addAssistantPackingIdeas}
                  onStartAddToCalendar={handleStartAddToCalendar}
                  onClearConversation={handleClearConversation}
                  brainstormStatusByMessage={brainstormStatusByMessage}
                  packingStatusByMessage={packingStatusByMessage}
                  calendarStatusByMessage={calendarStatusByMessage}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      <ItemDialog
        open={calendarDialogOpen}
        onOpenChange={handleCalendarDialogChange}
        defaultDate={calendarDraft?.startDate ?? tripStart}
        editItem={null}
        initialInput={calendarDraft}
        currentUserName={currentUserName}
        isSaving={isMutating}
        onSave={handleSaveCalendarDraft}
        onDelete={async () => {}}
      />

      <Dialog
        open={calendarImportDialogOpen}
        onOpenChange={(open) => {
          if (!open && calendarImportTransitionRef.current) {
            calendarImportTransitionRef.current = false
            setCalendarImportDialogOpen(false)
            return
          }

          setCalendarImportDialogOpen(open)
          if (!open) {
            resetCalendarImportState()
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-base font-medium">Add itinerary items</DialogTitle>
            <DialogDescription>
              I found {calendarCandidates.length} calendar item{calendarCandidates.length === 1 ? "" : "s"} in that response. Review them, uncheck anything you do not want, or import the selected ones.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-5">
            {calendarCandidates.map((candidate) => (
              <div
                key={candidate.key}
                className={`rounded-2xl border p-4 transition-opacity ${
                  selectedCalendarCandidateKeys.includes(candidate.key)
                    ? "border-border/70 bg-secondary/20"
                    : "border-border/40 bg-secondary/10 opacity-55"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedCalendarCandidateKeys.includes(candidate.key)}
                    onCheckedChange={(checked) => toggleCalendarCandidateSelection(candidate.key, checked === true)}
                    className="mt-1 h-5 w-5 rounded-md"
                    aria-label={`Select ${candidate.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{candidate.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {candidate.startDate === candidate.endDate
                        ? candidate.startDate
                        : `${candidate.startDate} to ${candidate.endDate}`}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{candidate.sourceLine}</div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleEditCalendarCandidate(candidate)}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => {
                setCalendarImportDialogOpen(false)
                resetCalendarImportState()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddAllCalendarCandidates()}
              disabled={isMutating || selectedCalendarCandidateKeys.length === 0}
            >
              Add selected {selectedCalendarCandidateKeys.length > 0 ? `(${selectedCalendarCandidateKeys.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
