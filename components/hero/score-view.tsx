'use client'

import { ArrowUpRight, PartyPopper, Target, TrendingUp } from 'lucide-react'
import { ScoreRing } from '@/components/hero/score-ring'

const BREAKDOWN = [
  { id: 'Hằng Đẳng thức', label: 'Hằng Đẳng thức', value: 92 },
  { id: 'Phương trình bật nhất', label: 'Phương trình bật nhất', value: 80 },
  { id: 'Hệ phương trình', label: 'Hệ phương trình', value: 64 },
]

export function ScoreView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-5 text-center sm:p-7">
      <div className="animate-pop-in space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-[11px] font-medium text-success">
          <PartyPopper className="size-3.5" aria-hidden="true" />
          Bài đã được nộp!
        </span>
      </div>

      <div
        className="animate-pop-in"
        style={{ animationDelay: '120ms' }}
      >
        <ScoreRing value={80} />
      </div>

      <div
        className="animate-slide-up-fade space-y-1"
        style={{ animationDelay: '600ms' }}
      >
        <p className="text-base font-semibold text-foreground">
          Làm hay lắm!, Văn A — 8 trên 10 điểm
        </p>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="size-3.5 text-success" aria-hidden="true" />
          Điểm trung bình tăng 0.3 từ tuần trước
        </p>
      </div>

      <ul className="w-full max-w-sm space-y-2.5">
        {BREAKDOWN.map((topic, index) => (
          <li
            key={topic.id}
            className="animate-slide-up-fade"
            style={{ animationDelay: `${800 + index * 120}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-left text-xs text-muted-foreground">
                {topic.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${topic.value}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
                {topic.value}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div
        className="animate-slide-up-fade flex items-center gap-1.5 text-[11px] text-muted-foreground"
        style={{ animationDelay: '1200ms' }}
      >
        <Target className="size-3.5" aria-hidden="true" />
        Review respiration
        <ArrowUpRight className="size-3" aria-hidden="true" />
      </div>
    </div>
  )
}
