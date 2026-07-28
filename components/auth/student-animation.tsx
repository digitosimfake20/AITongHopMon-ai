'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Trophy, Zap, Award } from 'lucide-react'

export function StudentAnimation() {
  const [stage, setStage] = useState<'study' | 'submit' | 'celebrate'>('study')

  useEffect(() => {
    const timings = [3000, 6000, 9000]
    const timeouts = timings.map((delay, i) => 
      setTimeout(() => {
        const stages: Array<'study' | 'submit' | 'celebrate'> = ['study', 'submit', 'celebrate']
        setStage(stages[i % stages.length])
      }, delay)
    )
    return () => timeouts.forEach(t => clearTimeout(t))
  }, [])

  return (
    <div className="relative aspect-[4/3] w-full min-h-[320px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-card">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Student studying */}
      {stage === 'study' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-foreground" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-32 bg-primary/30 rounded-full" />
                <div className="h-2 w-24 bg-primary/20 rounded-full" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Học sinh làm bài kiểm tra...
            </p>
          </div>
        </div>
      )}

      {/* Submitting */}
      {stage === 'submit' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-spin">
                <Zap className="w-10 h-10 text-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Đang gửi bài...
            </p>
          </div>
        </div>
      )}

      {/* Celebrating */}
      {stage === 'celebrate' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <Trophy className="w-12 h-12 text-foreground animate-bounce" />
            </div>
            <div className="text-6xl font-bold text-foreground">9.5/10</div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Tuyệt vời!</p>
              <p className="text-sm text-muted-foreground">Bạn vừa hoàn thành bài kiểm tra</p>
            </div>
            <div className="flex justify-center gap-4">
              <Award className="w-6 h-6 text-foreground" />
              <CheckCircle2 className="w-6 h-6 text-foreground" />
              <Trophy className="w-6 h-6 text-foreground" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
