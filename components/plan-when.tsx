import { Moon, Sunrise } from "lucide-react"

import { describePlanWhen, type WhenPlan } from "@/lib/plan-when"

export function PlanWhen({
  item,
  day,
  dayItems,
}: {
  item: WhenPlan
  day: string
  dayItems: readonly WhenPlan[]
}) {
  const when = describePlanWhen(item, day, dayItems)
  return (
    <span className="plan-when" data-plan-when="">
      {when.parts.map((part) => (
        <span key={`${part.icon ?? "text"}-${part.text}`} className="plan-when__tag">
          {part.icon === "sunrise" ? <Sunrise className="plan-when__icon" aria-hidden="true" /> : null}
          {part.icon === "moon" ? <Moon className="plan-when__icon" aria-hidden="true" /> : null}
          <span>{part.text}</span>
        </span>
      ))}
    </span>
  )
}
