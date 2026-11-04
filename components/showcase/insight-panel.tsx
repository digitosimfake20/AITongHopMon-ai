import { AlertTriangle, CircleCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopicRow {
  id: string
  label: string
  value: number
  status: 'solid' | 'watch'
}

const TOPICS: TopicRow[] = [
  { id: 'photo', label: 'Hằng đẳng thức', value: 92, status: 'solid' },
  { id: 'cells', label: 'Phương trình bậc nhất', value: 84, status: 'solid' },
  { id: 'resp', label: 'Hệ phương trình', value: 58, status: 'watch' },
  { id: 'enzymes', label: 'Bất phương trình', value: 71, status: 'solid' },
]

/** Static marketing panel — no IntersectionObserver island on the landing path. */
export function InsightPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            Tình hình lớp
          </p>
          <p className="text-xs text-muted-foreground">
            Toán 9 · 29 học sinh · Kỳ I
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md bg-foreground px-2 py-1 text-[10px] font-medium tracking-wide text-background">
          <Sparkles className="size-3" aria-hidden="true" />
          AI
        </span>
      </div>

      <ul className="mt-5 space-y-3.5">
        {TOPICS.map((topic) => (
          <li key={topic.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-card-foreground">
                {topic.status === 'solid' ? (
                  <CircleCheck
                    className="size-3.5 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="size-3.5 text-destructive"
                    aria-hidden="true"
                  />
                )}
                {topic.label}
                <span className="sr-only">
                  {topic.status === 'solid' ? 'Vững' : 'Cần theo dõi'}
                </span>
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {topic.value}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full',
                  topic.status === 'solid' ? 'bg-primary' : 'bg-destructive',
                )}
                style={{ width: `${topic.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-border bg-secondary/60 p-4">
        <p className="text-[11px] font-semibold tracking-wide text-foreground">
          Gợi ý tiết sau
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-card-foreground">
          Ôn hằng đẳng thức và hệ phương trình bậc nhất bằng một ví dụ cụ thể, rồi kiểm lại bốn học sinh đã đánh dấu.
        </p>
      </div>
    </div>
  )
}
