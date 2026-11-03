'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Trophy, Zap, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StudentAnimation() {
  const [stage, setStage] = useState<'study' | 'submit' | 'celebrate'>('study')

  useEffect(() => {
    const timings = [3000, 6000, 9000]
    const timeouts = timings.map((delay, i) =>
      setTimeout(() => {
        const stages: Array<'study' | 'submit' | 'celebrate'> = [
          'study',
          'submit',
          'celebrate',
        ]
        setStage(stages[i % stages.length])
      }, delay),
    )
    return () => timeouts.forEach((t) => clearTimeout(t))
  }, [])

  return (
    <div className="relative aspect-[4/3] w-full min-h-[320px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-card">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {stage === 'study' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <BookOpen className="h-8 w-8 text-foreground" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-32 rounded-full bg-primary/25" />
                <div className="h-2 w-24 rounded-full bg-primary/15" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Học sinh làm bài kiểm tra...
            </p>
          </div>
        </div>
      )}

      {stage === 'submit' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 space-y-4">
            <div className="flex justify-center">
              <div
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full bg-primary/15',
                  'motion-safe:animate-pulse',
                )}
              >
                <Zap className="h-10 w-10 text-foreground" aria-hidden="true" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Đang gửi bài...
            </p>
          </div>
        </div>
      )}

      {stage === 'celebrate' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 space-y-6 text-center">
            <div className="flex justify-center">
              <Trophy className="h-12 w-12 text-foreground" aria-hidden="true" />
            </div>
            <div className="text-6xl font-bold text-foreground">9.5/10</div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Tuyệt vời!</p>
              <p className="text-sm text-muted-foreground">
                Bạn vừa hoàn thành bài kiểm tra
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Award className="h-6 w-6 text-foreground" aria-hidden="true" />
              <CheckCircle2 className="h-6 w-6 text-foreground" aria-hidden="true" />
              <Trophy className="h-6 w-6 text-foreground" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
