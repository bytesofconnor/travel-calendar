import { NextRequest, NextResponse } from "next/server"

import { getAiConfig, isAiConfigured } from "@/lib/ai/env"

type BrainstormRequest = {
  message?: string
  history?: Array<{
    role?: "user" | "assistant"
    content?: string
  }>
  trip?: {
    name?: string
    startDate?: string
    endDate?: string
  }
  noteDraft?: string
  items?: Array<{
    title: string
    startDate: string
    endDate: string
    location: string
    locationTo?: string
  }>
  packingItems?: Array<{
    label: string
    isChecked: boolean
  }>
}

function limitText(value: string, max = 2400) {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? raw
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.")
  }

  return JSON.parse(candidate.slice(start, end + 1)) as {
    answer?: unknown
    brainstormBullets?: unknown
    packingSuggestions?: unknown
    caution?: unknown
  }
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

function normalizeHistory(
  value: BrainstormRequest["history"],
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry): entry is { role: "user" | "assistant"; content: string } =>
        !!entry &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0
    )
    .map((entry) => ({
      role: entry.role,
      content: limitText(entry.content.trim(), 900),
    }))
    .slice(-10)
}

export async function POST(request: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured yet." }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as BrainstormRequest | null
  const message = body?.message?.trim()

  if (!message) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 })
  }

  const { provider, model, apiKey } = getAiConfig()

  if (provider !== "openrouter") {
    return NextResponse.json({ error: `Unsupported AI provider: ${provider}` }, { status: 400 })
  }

  const tripName = body?.trip?.name?.trim() || "this trip"
  const tripDates =
    body?.trip?.startDate && body?.trip?.endDate
      ? `${body.trip.startDate} to ${body.trip.endDate}`
      : "dates still flexible"

  const itemSummary = (body?.items ?? [])
    .slice(0, 24)
    .map((item) => `- ${item.startDate}${item.startDate !== item.endDate ? ` to ${item.endDate}` : ""}: ${item.title} (${item.location}${item.locationTo ? ` -> ${item.locationTo}` : ""})`)
    .join("\n")

  const packingSummary = (body?.packingItems ?? [])
    .slice(0, 24)
    .map((item) => `- ${item.isChecked ? "[packed]" : "[todo]"} ${item.label}`)
    .join("\n")

  const noteSummary = limitText(body?.noteDraft?.trim() || "", 2200)
  const history = normalizeHistory(body?.history)

  const systemPrompt = [
    "You are Trip Copilot, a concise but genuinely helpful AI assistant inside a shared travel planning app.",
    "Your job is to help two travelers brainstorm ideas, recommendations, food, logistics, and packing suggestions.",
    "Be specific and practical. Prioritize usefulness over fluff.",
    "You do not have live browsing in this environment, so avoid pretending to know current hours, prices, or booking availability.",
    "If a detail is likely time-sensitive, say so briefly.",
    "When recent conversation is provided, treat it as ongoing context and build on it naturally.",
    "Return valid JSON only with this exact shape:",
    '{ "answer": string, "brainstormBullets": string[], "packingSuggestions": string[], "caution": string | null }',
    "Use brainstormBullets for ideas worth saving to the shared brainstorming note.",
    "Use packingSuggestions only when the question naturally calls for items to pack.",
    "Keep brainstormBullets and packingSuggestions short and action-oriented.",
  ].join(" ")

  const userPrompt = [
    `Trip: ${tripName}`,
    `Trip window: ${tripDates}`,
    itemSummary ? `Current plans:\n${itemSummary}` : "Current plans: none yet.",
    packingSummary ? `Current packing list:\n${packingSummary}` : "Current packing list: empty.",
    noteSummary ? `Current brainstorm notes:\n${noteSummary}` : "Current brainstorm notes: empty.",
    `Traveler question: ${message}`,
  ].join("\n\n")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Our Calendar",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        { role: "user", content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    return NextResponse.json(
      { error: payload?.error?.message ?? "Unable to reach the AI provider." },
      { status: response.status }
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }

  const content = payload.choices?.[0]?.message?.content?.trim()

  if (!content) {
    return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 })
  }

  try {
    const parsed = extractJsonObject(content)
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : ""

    return NextResponse.json({
      answer: answer || "I couldn’t turn that into a useful answer yet.",
      brainstormBullets: normalizeStringArray(parsed.brainstormBullets),
      packingSuggestions: normalizeStringArray(parsed.packingSuggestions),
      caution: typeof parsed.caution === "string" && parsed.caution.trim() ? parsed.caution.trim() : null,
    })
  } catch {
    return NextResponse.json({
      answer: content,
      brainstormBullets: [],
      packingSuggestions: [],
      caution: "This answer came back as plain text, so save actions are limited.",
    })
  }
}
