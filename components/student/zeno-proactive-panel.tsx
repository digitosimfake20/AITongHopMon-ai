'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Flame, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'
import { PRACTICE_TIME_LIMIT_MINUTES } from '@/lib/quiz/practice-quiz'
import { PracticePreTestModal } from '@/components/quiz/practice-pretest-modal'

interface ZenoProactivePanelProps {
  studentName: string
  streakDays: number
  weakTopic?: string | null
}

export function ZenoProactivePanel({
  studentName,
  streakDays,
  weakTopic,
}: ZenoProactivePanelProps) {
  const firstName = studentName.split(/\s+/).pop() ?? studentName
  const [pretestOpen, setPretestOpen] = useState(false)
  const [pendingQuiz, setPendingQuiz] = useState<{
    testId: string
    questionCount: number
    timeLimitMinutes: number
    weakTopic: string
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!weakTopic) return
    const key = `zeno-toast-${weakTopic}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    toast('Gợi ý ôn tập từ Zeno', {
      description: `Điểm yếu ở dạng ${weakTopic}. Luyện ${PRACTICE_TIME_LIMIT_MINUTES} phút để củng cố.`,
      duration: 8000,
      action: {
        label: 'Luyện ngay',
        onClick: () => void handleGeneratePractice(false),
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weakTopic])

  async function handleGeneratePractice(saveForLater: boolean) {
    setIsGenerating(true)
    const result = await generateSmartQuizAction({ saveForLater })
    setIsGenerating(false)

    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Không thể tạo bài luyện')
      return
    }

    if (saveForLater) {
      const { addSavedPractice } = await import('@/lib/quiz/active-quiz-session')
      addSavedPractice({
        testId: result.data.testId,
        title: `Luyện tập: ${result.data.weakTopic}`,
        topic: result.data.weakTopic,
        questionCount: result.data.questionCount,
        timeLimitMinutes: result.data.timeLimitMinutes,
        savedAt: Date.now(),
      })
      toast.success('Đã thêm vào tab "Làm sau"')
      window.location.href = '/quizzes?tab=later'
      return
    }

    setPendingQuiz({
      testId: result.data.testId,
      questionCount: result.data.questionCount,
      timeLimitMinutes: result.data.timeLimitMinutes,
      weakTopic: result.data.weakTopic,
    })
    setPretestOpen(true)
  }

  return (
    <>
      <div className="col-span-full space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zeno text-zeno-foreground">
              <Zap className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{firstName}</p>
              {streakDays > 0 ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Flame className="size-4 text-amber-500" aria-hidden />
                  Chuỗi học · <strong className="text-foreground">{streakDays} ngày</strong> liên tiếp
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Làm một bài hôm nay để mở chuỗi học.
                </p>
              )}
            </div>
          </div>
          {weakTopic ? (
            <Button
              className="min-h-11 shrink-0 gap-1.5"
              disabled={isGenerating}
              aria-busy={isGenerating || undefined}
              onClick={() => void handleGeneratePractice(false)}
            >
              <Sparkles className="size-3.5" aria-hidden />
              {isGenerating ? 'Đang chuẩn bị...' : `Luyện ${PRACTICE_TIME_LIMIT_MINUTES} phút`}
            </Button>
          ) : null}
        </div>

        {weakTopic ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/25">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-amber-900 dark:text-amber-200">
              Zeno đánh dấu dạng <strong>{weakTopic}</strong> còn yếu. Luyện{' '}
              {PRACTICE_TIME_LIMIT_MINUTES} phút để củng cố.
            </p>
          </div>
        ) : null}
      </div>

      {pendingQuiz ? (
        <PracticePreTestModal
          open={pretestOpen}
          onOpenChange={setPretestOpen}
          testId={pendingQuiz.testId}
          title={`Luyện tập: ${pendingQuiz.weakTopic}`}
          topic={pendingQuiz.weakTopic}
          questionCount={pendingQuiz.questionCount}
          timeLimitMinutes={pendingQuiz.timeLimitMinutes}
        />
      ) : null}
    </>
  )
}
