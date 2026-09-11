import { ConvexTripCalendarApp } from "@/components/convex-trip-calendar-app"

interface PageProps {
  searchParams?: Promise<{
    join?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const joinCode = resolvedSearchParams?.join

  return <ConvexTripCalendarApp joinCode={joinCode} />
}
