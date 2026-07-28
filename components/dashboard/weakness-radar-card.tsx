import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WeakTopic } from '@/lib/dashboard-types'
import { cn } from '@/lib/utils'

interface WeaknessRadarCardProps {
  topics: WeakTopic[]
}

const BAR_COLORS: Record<WeakTopic['severity'], string> = {
  weak: 'bg-destructive',
  moderate: 'bg-primary',
}

export function WeaknessRadarCard({ topics }: WeaknessRadarCardProps) {
  return (
    <article className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)] lg:col-span-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        <h2 className="text-base font-semibold text-card-foreground">
          Lỗ hổng cần ôn tập gấp
        </h2>
      </div>

      <ul className="mt-5 space-y-5">
        {topics.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có dữ liệu luyện tập. Làm bài kiểm tra hoặc chat với Zeno để nhận phân tích.
          </li>
        ) : (
          topics.map((topic) => (
            <li key={topic.id} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-card-foreground">{topic.label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {topic.accuracy}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full transition-all', BAR_COLORS[topic.severity])}
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="min-h-11 shrink-0"
                  nativeButton={false}
                  render={<Link href={`/adaptive?topic=${topic.id}`} />}
                >
                  Vá lỗi này
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </article>
  )
}
