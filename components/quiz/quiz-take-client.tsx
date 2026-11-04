'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { QuizPreTestGate } from '@/components/quiz/quiz-pretest-gate'
import type { QuizTakingData } from '@/lib/quiz/quiz-bank-queries'

interface QuizTakeClientProps {
  data: QuizTakingData
}

/** Keep katex / quiz-taker off the intro gate's critical client graph. */
const QuizTaker = dynamic(
  () =>
    import('@/components/quiz/quiz-taker').then((m) => ({ default: m.QuizTaker })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Đang tải bài làm...
      </div>
    ),
  },
)

function QuizTakeInner({ data }: QuizTakeClientProps) {
  const gateData = {
    testId: data.testId,
    title: data.title,
    timeLimitMinutes: data.timeLimitMinutes,
    questionCount: data.questions.length,
    topic: data.topic,
    isPersonalPractice: data.isPersonalPractice,
  }

  return (
    <QuizPreTestGate data={gateData}>
      <QuizTaker data={data} />
    </QuizPreTestGate>
  )
}

export function QuizTakeClient({ data }: QuizTakeClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Đang tải bài kiểm tra...
        </div>
      }
    >
      <QuizTakeInner data={data} />
    </Suspense>
  )
}
