'use client'

import { Laptop, Smile, Sparkles, Zap } from 'lucide-react'
import { QuizView } from '@/components/hero/quiz-view'
import { ScoreView } from '@/components/hero/score-view'
import { TeacherView } from '@/components/hero/teacher-view'
import { useDemoSequence } from '@/components/hero/use-demo-sequence'
import { useInView } from '@/hooks/use-in-view'
import { DEMO_QUESTIONS } from '@/lib/content'
import type { DemoStage } from '@/lib/types'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<DemoStage, string> = {
  quiz: 'Student view',
  score: 'Instant result',
  teacher: 'Teacher dashboard',
}

const STAGES: DemoStage[] = ['quiz', 'score', 'teacher']

export function ProductDemo() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 })
  const { stage, questionIndex, selectedOptionId, revealed, loop } =
    useDemoSequence(inView)

  const question = DEMO_QUESTIONS[questionIndex] ?? DEMO_QUESTIONS[0]

  return (
    <div ref={ref} className="relative">
      {/* Device frame */}
      <div className="relative rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="flex max-w-[15rem] items-center gap-1.5 truncate rounded-md bg-secondary px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
              <Laptop className="size-3 shrink-0" aria-hidden="true" />
              app.markwise.io
            </div>
          </div>
          <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            {STAGE_LABELS[stage]}
          </span>
        </div>

        <div className="relative h-[27rem] overflow-hidden sm:h-[29rem]">
          <div key={`${stage}-${loop}`} className="absolute inset-0">
            {stage === 'quiz' ? (
              <QuizView
                question={question}
                questionIndex={questionIndex}
                totalQuestions={DEMO_QUESTIONS.length}
                selectedOptionId={selectedOptionId}
                revealed={revealed}
              />
            ) : null}
            {stage === 'score' ? <ScoreView /> : null}
            {stage === 'teacher' ? <TeacherView /> : null}
          </div>
        </div>
      </div>

      {/* Floating callouts that follow the story */}
      <FloatingCard
        visible={stage === 'score'}
        className="-right-3 top-16 sm:-right-8"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-success/15 text-success">
          <Smile className="size-4" aria-hidden="true" />
        </span>
        <div className="text-left">
          <p className="font-mono text-sm font-semibold leading-none text-foreground">
            80%
          </p>
          <p className="text-[10px] text-muted-foreground">Văn A, lớp 9 </p>
        </div>
      </FloatingCard>

      <FloatingCard
        visible={stage === 'teacher'}
        className="-bottom-6 left-3 sm:left-6"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold leading-none text-foreground">
            AI tóm tắt sẵn sàng
          </p>
          <p className="text-[10px] text-muted-foreground">
            Đã gửi cho cô Cao Minh
          </p>
        </div>
      </FloatingCard>

      <FloatingCard visible className="-bottom-5 right-4 hidden sm:flex sm:right-8">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Zap className="size-4" aria-hidden="true" />
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold leading-none text-foreground">
            28 bài kiểm tra đã được chấm
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">1.8s</p>
        </div>
      </FloatingCard>

      {/* Stage indicator */}
      <div
        className="mt-12 flex items-center justify-center gap-2 sm:mt-10"
        aria-hidden="true"
      >
        {STAGES.map((item) => (
          <span
            key={item}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              stage === item ? 'w-8 bg-primary' : 'w-4 bg-border',
            )}
          />
        ))}
      </div>
      <p className="sr-only">
        An animated preview: a student answers a quiz, sees a score of 80
        percent, and the teacher receives an AI summary of the class results.
      </p>
    </div>
  )
}

interface FloatingCardProps {
  visible: boolean
  className?: string
  children: React.ReactNode
}

function FloatingCard({ visible, className, children }: FloatingCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute z-10 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)]',
        'transition-all duration-500 ease-out',
        visible
          ? 'animate-soft-float translate-y-0 scale-100 opacity-100'
          : 'translate-y-2 scale-95 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}
