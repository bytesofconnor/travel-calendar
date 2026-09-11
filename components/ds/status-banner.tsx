import { cn } from "@/lib/utils"

interface StatusBannerProps {
  tone: "success" | "error" | "info"
  children: React.ReactNode
  className?: string
}

const toneClass: Record<StatusBannerProps["tone"], string> = {
  success:
    "border-[color-mix(in_oklab,var(--kind-place)_40%,var(--border))] bg-[color-mix(in_oklab,var(--kind-place)_14%,var(--background))] text-foreground",
  error:
    "border-destructive/35 bg-destructive/10 text-destructive",
  info: "border-border bg-secondary text-foreground",
}

export function StatusBanner({ tone, children, className }: StatusBannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "border-b px-4 py-2.5 text-sm",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
