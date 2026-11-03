'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'
import { addSavedPractice } from '@/lib/quiz/active-quiz-session'
import { PracticePreTestModal } from '@/components/quiz/practice-pretest-modal'
import {
  masteryStatusFromP,
  masteryStatusLabelVi,
} from '@/lib/knowledge/mastery-labels'
import { cn } from '@/lib/utils'

export interface AdaptiveTopicItem {
  nodeId: string
  title: string
  pMastery: number
}

interface AdaptiveTopicListProps {
  topics: AdaptiveTopicItem[]
  /** Knowledge node id from `?topic=` — highlight, scroll, and drive practice. */
  focusTopicId?: string | null
}

export function AdaptiveTopicList({ topics, focusTopicId }: AdaptiveTopicListProps) {
  const router = useRouter()
  const focusRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [pretestOpen, setPretestOpen] = useState(false)
  const [pendingQuiz, setPendingQuiz] = useState<{
    testId: string
    questionCount: number
    timeLimitMinutes: number
    weakTopic: string
  } | null>(null)

  const focused = focusTopicId
    ? topics.find((t) => t.nodeId === focusTopicId)
    : undefined

  useEffect(() => {
    if (!focusTopicId || !focusRef.current) return
    focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusTopicId])

  function startPractice(topic: AdaptiveTopicItem, saveForLater: boolean) {
    const key = `${topic.nodeId}:${saveForLater ? 'later' : 'now'}`
    setPendingKey(key)
    startTransition(async () => {
      const result = await generateSmartQuizAction({
        saveForLater,
        topicKeys: [topic.nodeId],
        topicTitles: [topic.title],
      })
      setPendingKey(null)
      if (result.success && result.data) {
        if (saveForLater) {
          addSavedPractice({
            testId: result.data.testId,
            title: `Luyện tập: ${result.data.weakTopic}`,
            topic: result.data.weakTopic,
            questionCount: result.data.questionCount,
            timeLimitMinutes: result.data.timeLimitMinutes,
            savedAt: Date.now(),
          })
          toast.success('Đã thêm vào tab Làm sau trong Ngân hàng đề')
          router.push('/quizzes?tab=later')
          return
        }
        setPendingQuiz({
          testId: result.data.testId,
          questionCount: result.data.questionCount,
          timeLimitMinutes: result.data.timeLimitMinutes,
          weakTopic: result.data.weakTopic,
        })
        setPretestOpen(true)
      } else {
        toast.error(result.error ?? 'Không tạo được bài luyện')
      }
    })
  }

  const ordered = focused
    ? [focused, ...topics.filter((t) => t.nodeId !== focused.nodeId)]
    : topics

  return (
    <>
      {focused ? (
        <p
          className="mb-3 rounded-lg border border-zeno/30 bg-zeno/10 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          Đang mở chủ đề yếu:{' '}
          <strong className="font-semibold">{focused.title}</strong>
          . Bấm &quot;Luyện chủ đề này&quot; để trộn đề từ kho cho đúng lỗ hổng đó.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((state) => {
          const p = state.pMastery
          const mastery = Math.round(p * 100)
          const status = masteryStatusFromP(p)
          const isFocus = focusTopicId === state.nodeId
          const colorClass =
            status === 'WEAK'
              ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
              : status === 'MEDIUM'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          const barColor =
            status === 'WEAK'
              ? 'bg-rose-400'
              : status === 'MEDIUM'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
          const label = masteryStatusLabelVi(status)
          const practicingNow = pendingKey === `${state.nodeId}:now`
          const savingLater = pendingKey === `${state.nodeId}:later`

          return (
            <div
              key={state.nodeId}
              id={`topic-${state.nodeId}`}
              ref={isFocus ? focusRef : undefined}
              tabIndex={isFocus ? -1 : undefined}
              className={cn(
                'rounded-xl border p-3 outline-none transition-shadow',
                colorClass,
                isFocus && 'ring-2 ring-zeno ring-offset-2 ring-offset-background',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{state.title}</p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {mastery}%
                </span>
              </div>
              <div
                className="h-1.5 w-full rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={mastery}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${state.title}: ${label}`}
              >
                <div
                  className={cn('h-1.5 rounded-full', barColor)}
                  style={{ width: `${mastery}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>

              {isFocus ? (
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startPractice(state, false)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-zeno px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {practicingNow ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <BookOpen className="size-4" aria-hidden />
                    )}
                    Luyện chủ đề này
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startPractice(state, true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zeno/40 px-3 text-sm font-medium text-zeno hover:bg-zeno/10 disabled:opacity-60"
                  >
                    {savingLater ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Lưu vào &quot;Làm sau&quot;
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
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
