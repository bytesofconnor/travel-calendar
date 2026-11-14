import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReviewGallery } from "@/components/review-gallery"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Review",
  robots: { index: false, follow: false },
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string | string[]; theme?: string | string[] }>
}) {
  if (process.env.UI_REVIEW !== "1") {
    notFound()
  }

  const params = await searchParams
  const screen = typeof params.screen === "string" ? params.screen : "trip"
  const theme = typeof params.theme === "string" ? params.theme : null

  return <ReviewGallery screen={screen} theme={theme} />
}
