'use client'

import { useEffect, useState } from 'react'
import { Presentation, CheckSquare2, BarChart3, Smile, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type StageType = 'teaching' | 'grading' | 'celebrate'

export function TeacherAnimation() {
  const [stage, setStage] = useState<StageType>('teaching')

  useEffect(() => {
    const timings: number[] = [3000, 6000, 9000]
    const timeouts = timings.map((delay, i) =>
      setTimeout(() => {
        const stages: StageType[] = ['teaching', 'grading', 'celebrate']
        setStage(stages[i % stages.length])
      }, delay),
    )
    return () => timeouts.forEach((t) => clearTimeout(t))
  }, [])

  return (
    <div className="relative aspect-[4/3] w-full min-h-[320px] overflow-hidden rounded-xl border border-border bg-card text-left">

      {stage === 'teaching' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Presentation className="h-8 w-8 text-foreground" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full rounded-full bg-primary/25" />
                <div className="h-2 w-3/4 rounded-full bg-primary/15" />
                <div className="h-2 w-1/2 rounded-full bg-primary/15" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Thầy cô dạy lớp...
            </p>
          </div>
        </div>
      )}

      {stage === 'grading' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 w-full max-w-sm space-y-4">
            <div className="flex justify-center gap-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15',
                    'motion-safe:animate-pulse',
                  )}
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <CheckSquare2 className="h-6 w-6 text-foreground" aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Đang chấm điểm tự động...
            </p>
          </div>
        </div>
      )}

      {stage === 'celebrate' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 w-full max-w-sm space-y-6 text-center">
            <div className="flex justify-center">
              <BarChart3 className="h-12 w-12 text-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">28 học sinh</p>
              <p className="text-sm text-muted-foreground">đã nộp bài</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-muted/30 p-3 text-center">
              <div>
                <div className="text-xl font-bold text-foreground">18</div>
                <div className="text-xs text-muted-foreground">Giỏi</div>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">8</div>
                <div className="text-xs text-muted-foreground">Khá</div>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">2</div>
                <div className="text-xs text-muted-foreground">Cần dạy lại</div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <Smile className="h-6 w-6 text-foreground" aria-hidden="true" />
              <ThumbsUp className="h-6 w-6 text-foreground" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
