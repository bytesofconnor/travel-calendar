import { cn } from "@/lib/utils"

export function SkipLink({
  href = "#main-content",
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus-visible:not-sr-only focus:absolute focus-visible:absolute focus:left-4 focus-visible:left-4 focus:top-4 focus-visible:top-4 focus:z-[100] focus-visible:z-[100] focus:rounded-full focus-visible:rounded-full focus:bg-primary focus-visible:bg-primary focus:px-4 focus-visible:px-4 focus:py-3 focus-visible:py-3 focus:text-base focus-visible:text-base focus:font-medium focus-visible:font-medium focus:text-primary-foreground focus-visible:text-primary-foreground focus:shadow-lg focus-visible:shadow-lg focus:outline-none focus-visible:outline-none focus:ring-2 focus-visible:ring-2 focus:ring-ring focus-visible:ring-ring focus:ring-offset-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      Skip to main content
    </a>
  )
}
