'use client'

import { AlertTriangle, CircleCheck, Sparkles } from 'lucide-react'
import { useInView } from '@/hooks/use-in-view'
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

export function InsightPanel() {
  const { ref, inView } = useInView<HTMLDivElement>({
    once: true,
    threshold: 0.3,
  })

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.24)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            Class insight
          </p>
          <p className="text-xs text-muted-foreground">
            Toán 9 · 29 học sinh · Kì I
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
          Auto
        </span>
      </div>

      <ul className="mt-5 space-y-3.5">
        {TOPICS.map((topic, index) => (
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
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {topic.value}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-1000 ease-out',
                  topic.status === 'solid' ? 'bg-primary' : 'bg-destructive',
                )}
                style={{
                  width: inView ? `${topic.value}%` : '0%',
                  transitionDelay: `${index * 120}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-primary/25 bg-accent/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
          Bài học tiếp theo được đề xuất
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-card-foreground">
          Hãy ôn lại kiến ​​thức về hằng đẳng thức và hệ phương trình bậc nhất qua một ví dụ minh họa cụ thể, sau đó kiểm tra lại bốn học sinh đã được đánh dấu. Mọi khâu khác đã sẵn sàng để chuyển sang phần tiếp theo.
        </p>
      </div>
    </div>
  )
}
