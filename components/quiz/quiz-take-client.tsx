'use client'

import { Suspense } from 'react'
import { QuizPreTestGate } from '@/components/quiz/quiz-pretest-gate'
import { QuizTaker } from '@/components/quiz/quiz-taker'
import type { QuizTakingData } from '@/lib/quiz/quiz-bank-queries'

interface QuizTakeClientProps {
  data: QuizTakingData
}

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
