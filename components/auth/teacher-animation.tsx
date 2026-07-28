'use client'

import { useEffect, useState } from 'react'
import { Presentation, CheckSquare2, BarChart3, Smile, ThumbsUp } from 'lucide-react'

type StageType = 'teaching' | 'grading' | 'celebrate'

export function TeacherAnimation() {
  const [stage, setStage] = useState<StageType>('teaching')

  useEffect(() => {
    const timings: number[] = [3000, 6000, 9000]
    const timeouts = timings.map((delay, i) => 
      setTimeout(() => {
        const stages: StageType[] = ['teaching', 'grading', 'celebrate']
        setStage(stages[i % stages.length])
      }, delay)
    )
    return () => timeouts.forEach((t) => clearTimeout(t))
  }, [])

  return (
    <div className="relative aspect-[4/3] w-full min-h-[320px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-card text-left">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Teaching */}
      {stage === 'teaching' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="animate-pulse space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Presentation className="w-8 h-8 text-foreground" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-3 w-full bg-primary/30 rounded-full" />
                <div className="h-2 w-3/4 bg-primary/20 rounded-full" />
                <div className="h-2 w-1/2 bg-primary/20 rounded-full" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Thầy cô dạy lớp...
            </p>
          </div>
        </div>
      )}

      {/* Grading */}
      {stage === 'grading' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex justify-center gap-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <CheckSquare2 className="w-6 h-6 text-foreground" />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Đang chấm điểm tự động...
            </p>
          </div>
        </div>
      )}

      {/* Celebrating */}
      {stage === 'celebrate' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="space-y-6 text-center w-full max-w-sm">
            <div className="flex justify-center">
              <BarChart3 className="w-12 h-12 text-foreground animate-bounce" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">28 học sinh</p>
              <p className="text-sm text-muted-foreground">đã nộp bài</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-xl border border-border/50">
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
              <Smile className="w-6 h-6 text-foreground" />
              <ThumbsUp className="w-6 h-6 text-foreground" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}