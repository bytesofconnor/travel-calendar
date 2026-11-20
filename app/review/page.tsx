import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PairTripScreen } from "@/components/pair-trip-screen"
import { ReviewGallery } from "@/components/review-gallery"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Review",
  robots: { index: false, follow: false },
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    screen?: string | string[]
    theme?: string | string[]
    room?: string | string[]
    member?: string | string[]
    party?: string | string[]
  }>
}) {
  if (process.env.UI_REVIEW !== "1") {
    notFound()
  }

  const params = await searchParams
  const screen = typeof params.screen === "string" ? params.screen : "trip"
  const theme = typeof params.theme === "string" ? params.theme : null
  const partyRaw = typeof params.party === "string" ? Number(params.party) : NaN
  const party = Number.isInteger(partyRaw) && partyRaw >= 1 && partyRaw <= 10 ? partyRaw : null
  if (screen === "pair") {
    const room = typeof params.room === "string" ? params.room : ""
    const member = params.member === "partner" ? "partner" : params.member === "owner" ? "owner" : ""
    if (!room || !member) notFound()
    return <PairTripScreen roomId={room} member={member} />
  }

  return <ReviewGallery screen={screen} theme={theme} party={party} />
}
