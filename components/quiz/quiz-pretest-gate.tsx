'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addSavedPractice } from '@/lib/quiz/active-quiz-session'

interface QuizPreTestGateProps {
  data: {
    testId: string
    title: string
    timeLimitMinutes: number
    questionCount: number
    topic?: string
    isPersonalPractice?: boolean
  }
  children: React.ReactNode
}

export function QuizPreTestGate({ data, children }: QuizPreTestGateProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldStart =
    searchParams.get('start') === '1' || searchParams.get('resume') === '1'

  if (shouldStart) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-lg">
        <div className="text-center">
          <Sparkles className="mx-auto size-10 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Bạn đã sẵn sàng chưa?</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.title}</p>
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thời gian</span>
            <span className="font-medium">{data.timeLimitMinutes} phút</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số câu hỏi</span>
            <span className="font-medium">{data.questionCount}</span>
          </div>
          {data.topic ? (
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Chủ đề</span>
              <span className="text-right font-medium">{data.topic}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href={`/quiz/take/${data.testId}?start=1`} />}
          >
            Bắt đầu làm bài
          </Button>
          {data.isPersonalPractice ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                addSavedPractice({
                  testId: data.testId,
                  title: data.title,
                  topic: data.topic ?? 'Ôn tập',
                  questionCount: data.questionCount,
                  timeLimitMinutes: data.timeLimitMinutes,
                  savedAt: Date.now(),
                })
                router.push('/quizzes')
              }}
            >
              Làm sau
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
