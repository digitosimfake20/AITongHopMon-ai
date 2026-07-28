import { Activity, TrendingUp } from 'lucide-react'

interface ClassHealthCardProps {
  classAverage: number
  weeklyCompletionRate: number
}

export function ClassHealthCard({
  classAverage,
  weeklyCompletionRate,
}: ClassHealthCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)]">
      <h2 className="text-base font-semibold text-card-foreground">
        Sức khỏe Lớp học
      </h2>

      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="size-4" aria-hidden="true" />
            Điểm trung bình cả lớp
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">
            {classAverage.toFixed(1)}
            <span className="text-lg text-muted-foreground">/10</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="size-4" aria-hidden="true" />
            Tỷ lệ làm bài tuần này
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">
            {weeklyCompletionRate}
            <span className="text-lg text-muted-foreground">%</span>
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${weeklyCompletionRate}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
