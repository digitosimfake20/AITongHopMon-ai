import { Flame } from 'lucide-react'

interface StreakWidgetProps {
  days: number
}

export function StreakWidget({ days }: StreakWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(255,255,255,0.04),0_16px_40px_-20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
          <Flame className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Chuỗi học tập
          </p>
          <p className="text-sm font-semibold text-foreground">
            {days} ngày liên tiếp
          </p>
        </div>
      </div>
    </div>
  )
}
