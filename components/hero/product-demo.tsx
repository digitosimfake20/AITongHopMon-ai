'use client'

import dynamic from 'next/dynamic'
import { Laptop, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import {
  useDemoSequence,
  usePrefersReducedMotion,
} from '@/components/hero/use-demo-sequence'
import { useInView } from '@/hooks/use-in-view'
import { DEMO_QUESTIONS } from '@/lib/content'
import type { DemoStage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Stage views (incl. KaTeX in QuizView) stay out of the initial landing
 * bundle — loaded client-side only when the demo is in view / needs that stage.
 */
const QuizView = dynamic(
  () =>
    import('@/components/hero/quiz-view').then((m) => ({ default: m.QuizView })),
  {
    ssr: false,
    loading: () => <QuizStagePlaceholder />,
  },
)

const ScoreView = dynamic(
  () =>
    import('@/components/hero/score-view').then((m) => ({
      default: m.ScoreView,
    })),
  {
    ssr: false,
    loading: () => <GenericStagePlaceholder />,
  },
)

const TeacherView = dynamic(
  () =>
    import('@/components/hero/teacher-view').then((m) => ({
      default: m.TeacherView,
    })),
  {
    ssr: false,
    loading: () => <GenericStagePlaceholder />,
  },
)

const STAGE_LABELS: Record<DemoStage, string> = {
  quiz: 'Học sinh làm bài',
  score: 'Điểm tức thì',
  teacher: 'Dashboard giáo viên',
}

const STAGES: DemoStage[] = ['quiz', 'score', 'teacher']

function QuizStagePlaceholder() {
  return (
    <div
      className="flex h-full flex-col gap-5 p-5 sm:p-7"
      aria-hidden="true"
    >
      <div className="h-6 w-28 animate-pulse rounded-md bg-secondary" />
      <div className="h-1.5 w-full rounded-full bg-secondary" />
      <div className="h-8 w-full max-w-md animate-pulse rounded-md bg-secondary" />
      <div className="flex flex-col gap-2.5">
        <div className="h-12 animate-pulse rounded-xl bg-secondary" />
        <div className="h-12 animate-pulse rounded-xl bg-secondary" />
        <div className="h-12 animate-pulse rounded-xl bg-secondary" />
        <div className="h-12 animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  )
}

function GenericStagePlaceholder() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 p-5 sm:p-7"
      aria-hidden="true"
    >
      <div className="size-28 animate-pulse rounded-full bg-secondary" />
      <div className="h-4 w-40 animate-pulse rounded-md bg-secondary" />
      <div className="h-3 w-56 animate-pulse rounded-md bg-secondary" />
    </div>
  )
}

export function ProductDemo() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 })
  const reducedMotion = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)
  const { stage, questionIndex, selectedOptionId, revealed, loop } =
    useDemoSequence(inView, { paused, reducedMotion })

  const question = DEMO_QUESTIONS[questionIndex] ?? DEMO_QUESTIONS[0]
  const showControls = !reducedMotion

  return (
    <div ref={ref} className="relative">
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
              mathz.app
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[10px] font-medium tracking-wide text-muted-foreground sm:inline">
              {STAGE_LABELS[stage]}
            </span>
            {showControls ? (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Phát demo' : 'Tạm dừng demo'}
                aria-pressed={paused}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {paused ? (
                  <Play className="size-3.5" aria-hidden="true" />
                ) : (
                  <Pause className="size-3.5" aria-hidden="true" />
                )}
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative h-[27rem] overflow-hidden sm:h-[29rem]">
          <div key={`${stage}-${loop}`} className="absolute inset-0">
            {!inView ? (
              <QuizStagePlaceholder />
            ) : stage === 'quiz' ? (
              <QuizView
                question={question}
                questionIndex={questionIndex}
                totalQuestions={DEMO_QUESTIONS.length}
                selectedOptionId={selectedOptionId}
                revealed={revealed}
              />
            ) : stage === 'score' ? (
              <ScoreView />
            ) : (
              <TeacherView animateTyping={!reducedMotion && !paused} />
            )}
          </div>
        </div>
      </div>

      <div
        className="mt-8 flex items-center justify-center gap-2"
        aria-hidden="true"
      >
        {STAGES.map((item) => (
          <span
            key={item}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              stage === item ? 'w-8 bg-foreground' : 'w-4 bg-border',
              reducedMotion && 'transition-none',
            )}
          />
        ))}
      </div>
      <p className="sr-only">
        Xem trước: học sinh làm quiz, nhận điểm 80%, giáo viên đọc tóm tắt AI về
        lớp.
      </p>
    </div>
  )
}
