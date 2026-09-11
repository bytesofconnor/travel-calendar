import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "mara-empty min-h-0 flex-none gap-4 rounded-3xl border-solid p-8 md:p-10",
        className,
      )}
    >
      <EmptyHeader className="max-w-sm gap-2">
        <EmptyTitle className="trip-title text-2xl font-normal tracking-tight text-foreground">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-sm leading-6 text-muted-foreground">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent className="gap-3">{action}</EmptyContent> : null}
    </Empty>
  )
}
