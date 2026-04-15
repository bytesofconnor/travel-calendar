"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarPlus, Check, Loader2, NotebookPen, RotateCcw, Sparkles, WandSparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ItemDialog } from "@/components/item-dialog"
import { COUNTRIES, formatRelativeTime, type TripItem, type TripItemInput, type TripNote, type TripPackingItem } from "@/lib/kanban-store"

interface TripNotesViewProps {
  tripName: string
  tripStart: string
  tripEnd: string
  note: TripNote | null
  draft: string
  isDirty: boolean
  isSaving: boolean
  items: TripItem[]
  packingItems: TripPackingItem[]
  onDraftChange: (value: string) => void
  onSaveToBrainstorm: (content: string) => Promise<void>
  onAddPackingIdeas: (labels: string[]) => Promise<void> | void
  onAddCalendarItem: (input: TripItemInput) => Promise<void> | void
  currentUserName?: string
  isMutating?: boolean
}

type CopilotMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  brainstormBullets?: string[]
  packingSuggestions?: string[]
  caution?: string | null
}

function appendBlock(existing: string, addition: string) {
  const trimmedExisting = existing.trimEnd()
  const trimmedAddition = addition.trim()

  if (!trimmedAddition) {
    return existing
  }

  return trimmedExisting ? `${trimmedExisting}\n\n${trimmedAddition}` : trimmedAddition
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

      <div
        ref={messagesRef}
        className={`mt-4 min-h-0 flex-1 overflow-y-auto pr-1 ${
          mobile ? "pb-3" : ""
        }`}
      >
        {latestMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 px-4 py-6">
            <div className="text-sm font-medium text-foreground">Start with a simple question</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Try asking for Bolivia highlights, Peru food recommendations, route advice, or packing suggestions for altitude.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {latestMessages.map((message) => (
              (() => {
                const brainstormStatus = brainstormStatusByMessage[message.id] ?? "idle"
                const packingStatus = packingStatusByMessage[message.id] ?? "idle"
                const calendarStatus = calendarStatusByMessage[message.id] ?? "idle"
                const canAddToCalendar = message.role === "assistant" && (
                  message.brainstormBullets?.length ||
                  message.content.trim()
                )

                return (
                  <div
                    key={message.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      message.role === "user"
                        ? "border-primary/30 bg-primary/10"
                        : "border-border/70 bg-secondary/25"
                    }`}
                  >
                    <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {message.role === "user" ? "You asked" : "Trip Copilot"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{message.content}</div>

                    {message.role === "assistant" && message.brainstormBullets && message.brainstormBullets.length > 0 ? (
                      <div className="mt-4">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Worth saving
                        </div>
                        <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                          {message.brainstormBullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {message.role === "assistant" && message.packingSuggestions && message.packingSuggestions.length > 0 ? (
                      <div className="mt-4">
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Packing ideas
                        </div>
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
                            variant={calendarStatus === "saved" ? "outline" : "outline"}
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
              })()
            ))}
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

export function TripNotesView({
  tripName,
  tripStart,
  tripEnd,
  note,
  draft,
  isDirty,
  isSaving,
  items,
  packingItems,
  onDraftChange,
  onSaveToBrainstorm,
  onAddPackingIdeas,
  onAddCalendarItem,
  currentUserName,
  isMutating = false,
}: TripNotesViewProps) {
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
    [destinationLabel]
  )
  const conversationStorageKey = useMemo(
    () => `travel-calendar:copilot:${tripName}:${tripStart}:${tripEnd}`,
    [tripEnd, tripName, tripStart]
  )

  const metaLabel = note
    ? note.authorName
      ? `Last edited by ${note.authorName} ${formatRelativeTime(note.updatedAt)}`
      : `Updated ${formatRelativeTime(note.updatedAt)}`
    : "Shared brainstorming syncs across everyone on this trip."

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
          return (
            typeof candidate.id === "string" &&
            (candidate.role === "user" || candidate.role === "assistant") &&
            typeof candidate.content === "string"
          )
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

    const nextContent = appendBlock(draft, additions.join("\n"))

    setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "saving" }))
    onDraftChange(nextContent)

    try {
      await onSaveToBrainstorm(nextContent)
      setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "saved" }))
    } catch {
      setBrainstormStatusByMessage((current) => ({ ...current, [message.id]: "error" }))
    }
  }

  function buildCalendarDraft(message: CopilotMessage): TripItemInput {
    const bulletTitle = message.brainstormBullets?.find((bullet) => bullet.trim())
    const sentenceTitle = message.content
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .find(Boolean)

    const inferredCountry =
      COUNTRIES.find((country) => new RegExp(`\\b${country.name.replace(/\s+/g, "\\s+")}\\b`, "i").test(tripName)) ?? null
    const fallbackLocation =
      items[0]?.location ??
      inferredCountry?.locations[0]?.id ??
      COUNTRIES[0]?.locations[0]?.id ??
      ""

    return {
      title: (bulletTitle ?? sentenceTitle ?? "Trip idea").replace(/^[-•]\s*/, "").slice(0, 120),
      notes: message.content,
      startDate: tripStart,
      endDate: tripStart <= tripEnd ? tripStart : tripEnd,
      location: fallbackLocation,
    }
  }

  function handleStartAddToCalendar(message: CopilotMessage) {
    setCalendarDraft(buildCalendarDraft(message))
    setCalendarMessageId(message.id)
    setCalendarStatusByMessage((current) => ({ ...current, [message.id]: "editing" }))
    setCalendarDialogOpen(true)
  }

  async function handleSaveCalendarDraft(input: TripItemInput) {
    if (!calendarMessageId) {
      return
    }

    setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "saving" }))

    try {
      await onAddCalendarItem(input)
      setCalendarStatusByMessage((current) => ({ ...current, [calendarMessageId]: "saved" }))
      setCalendarDialogOpen(false)
      setCalendarDraft(null)
      setCalendarMessageId(null)
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
      setCalendarMessageId(null)
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
          noteDraft: draft,
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

  const copilotPanel = (
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-2 md:hidden">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Brainstorm
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Ideas and research</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shared notes, prompts, and trip thinking in one place.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-3 py-2.5 md:px-5 md:py-6">
        <div className="flex h-full min-h-0 w-full flex-col gap-2.5 md:grid md:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] md:grid-rows-[auto_minmax(0,1fr)] md:gap-x-5 md:gap-y-4 xl:grid-cols-[minmax(0,1fr)_minmax(460px,1fr)]">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
              <span>{isSaving ? "Saving…" : isDirty ? "Unsaved changes" : metaLabel}</span>
            </div>
            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => setMobileCopilotOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Ask AI
            </Button>
          </div>

          <div className="hidden md:block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:text-sm md:tracking-[0.2em]">
              Brainstorm
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">Ideas and research</h2>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Shared notes, prompts, and trip thinking in one place.
            </p>
          </div>

          <div className="flex min-h-0 flex-col rounded-[18px] border border-border/80 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur md:row-start-2">
            <div className="hidden items-start justify-between gap-4 md:flex">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <NotebookPen className="h-3.5 w-3.5" />
                  Shared Brainstorm
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">Shared trip notes</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Keep the working draft here while the copilot helps on the right.
                </p>
              </div>
              <div className="max-w-[320px] rounded-full border border-border/70 bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                  <span className="truncate">{isSaving ? "Saving…" : isDirty ? "Changes not saved yet" : metaLabel}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1">
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="Start a shared brain dump. Jot down restaurant ideas, route thoughts, timing questions, booking reminders, or anything else that still needs figuring out."
                className="h-full min-h-[420px] resize-none overflow-y-auto rounded-[18px] border-border/80 bg-black/35 px-4 py-4 text-base leading-8 text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur md:min-h-0 md:px-6 md:py-6 md:text-[15px]"
              />
            </div>
          </div>

          <aside className="hidden min-h-0 md:row-span-2 md:flex md:self-stretch">{copilotPanel}</aside>
        </div>
      </div>

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
    </section>
  )
}
