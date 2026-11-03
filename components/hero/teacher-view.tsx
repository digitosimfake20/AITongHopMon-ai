'use client'

import { Sparkles, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SUMMARY =
  'Lớp nắm khá vững hằng đẳng thức (92%) nhưng còn yếu hệ phương trình: 11/28 học sinh nhầm dạng. Nên ôn hệ phương trình trước, rồi kiểm lại bốn học sinh đã đánh dấu.'

const ROWS = [
  { id: 'r1', name: 'Nguyễn Văn A', score: 80, tone: 'good' as const },
  { id: 'r2', name: 'Nguyễn Văn B', score: 90, tone: 'good' as const },
  { id: 'r3', name: 'Nguyễn Văn C', score: 55, tone: 'watch' as const },
  { id: 'r4', name: 'Nguyễn Văn D', score: 75, tone: 'good' as const },
]

const TYPING_SPEED = 18

export function TeacherView() {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    const start = window.setTimeout(() => {
      let index = 0
      const interval = window.setInterval(() => {
        index += 2
        setTyped(SUMMARY.slice(0, index))
        if (index >= SUMMARY.length) window.clearInterval(interval)
      }, TYPING_SPEED)
    }, 700)

    return () => window.clearTimeout(start)
  }, [])

  return (
    <div className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Toán 9 - kiểm tra định kì
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            28/28 đã nộp · trung bình lớp 78%
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-success/12 px-2 py-1 text-[10px] font-medium tracking-wide text-success">
          Đã chấm
        </span>
      </header>

      <div className="animate-slide-up-fade rounded-xl border border-border bg-secondary/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold text-foreground">
            AI tóm tắt
          </span>
        </div>
        <p
          className="text-left text-[13px] leading-relaxed text-card-foreground"
          aria-live="polite"
        >
          {typed}
          <span
            className="animate-caret ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-primary"
            aria-hidden="true"
          />
        </p>
      </div>

      <ul className="flex flex-col gap-1.5" aria-label="Kết quả học sinh">
        {ROWS.map((row, index) => (
          <li
            key={row.id}
            className="animate-slide-up-fade flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            style={{ animationDelay: `${index * 110}ms` }}
          >
            <span className="truncate text-xs text-card-foreground">
              {row.name}
            </span>
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary sm:w-24">
                <div
                  className={cn(
                    'h-full rounded-full',
                    row.tone === 'good' ? 'bg-primary' : 'bg-destructive',
                  )}
                  style={{ width: `${row.score}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs tabular-nums text-foreground">
                {row.score}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
