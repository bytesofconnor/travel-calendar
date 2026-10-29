import { ConvexTripCalendarApp } from "@/components/convex-trip-calendar-app"

interface PageProps {
  searchParams?: Promise<{
    join?: string
    confirm?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const joinCode = resolvedSearchParams?.join
  const confirmId = resolvedSearchParams?.confirm

  return <ConvexTripCalendarApp joinCode={joinCode} confirmId={confirmId} />
}
