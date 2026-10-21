'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

    toast('Zeno AI gợi ý ôn tập', {
      description: `Zeno nhận thấy bạn đang gặp chút rắc rối ở dạng ${weakTopic}. Hãy thử bài luyện ${PRACTICE_TIME_LIMIT_MINUTES} phút để gỡ điểm nhé!`,
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
      toast.success('Đã lưu vào danh sách "Làm sau"')
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
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-teal-50/80 to-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/50 dark:from-sky-950/30 dark:via-teal-950/20 dark:to-emerald-950/20">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Zap className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Chào ngày mới, {firstName}! 
              </p>
              {streakDays > 0 ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Flame className="size-4 text-amber-500" aria-hidden />
                  Chuỗi học tập:{' '}
                  <strong className="text-foreground">{streakDays} ngày</strong> liên tiếp
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Làm bài hôm nay để bắt đầu chuỗi học tập.
                </p>
              )}
            </div>
          </div>
          {weakTopic ? (
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={isGenerating}
              onClick={() => void handleGeneratePractice(false)}
            >
              <Sparkles className="size-3.5" />
              {isGenerating ? 'Đang chuẩn bị...' : `Luyện ${PRACTICE_TIME_LIMIT_MINUTES} phút`}
            </Button>
          ) : null}
        </div>

        {weakTopic ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/25">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-amber-900 dark:text-amber-200">
              <strong>Zeno nhận thấy</strong> bạn đang gặp chút rắc rối ở dạng{' '}
              <strong>{weakTopic}</strong>. Hãy thử bài luyện {PRACTICE_TIME_LIMIT_MINUTES} phút để gỡ điểm nhé!
            </p>
          </div>
        ) : null}
      </div>

      {pendingQuiz ? (
        <PracticePreTestModal
          open={pretestOpen}
          onOpenChange={setPretestOpen}
          testId={pendingQuiz.testId}
          title={`Luyện tập — ${pendingQuiz.weakTopic}`}
          topic={pendingQuiz.weakTopic}
          questionCount={pendingQuiz.questionCount}
          timeLimitMinutes={pendingQuiz.timeLimitMinutes}
        />
      ) : null}
    </>
  )
}
