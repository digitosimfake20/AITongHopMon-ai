'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addSavedPractice } from '@/lib/quiz/active-quiz-session'
import { Brain, Zap, Clock, AlertTriangle, TrendingUp, TrendingDown, BookOpen, Loader2 } from 'lucide-react'
import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'
import { toast } from 'sonner'
import type { CognitiveProfileSummary } from '@/lib/dashboard-types'
import { PRACTICE_TIME_LIMIT_MINUTES } from '@/lib/quiz/practice-quiz'
import { PracticePreTestModal } from '@/components/quiz/practice-pretest-modal'

interface AiProfileCardProps {
  profile: CognitiveProfileSummary | null
  /** When set (from `/adaptive?topic=`), practice uses this knowledge node. */
  focusTopicId?: string | null
  focusTopicTitle?: string
}

export function AiProfileCard({
  profile,
  focusTopicId,
  focusTopicTitle,
}: AiProfileCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pretestOpen, setPretestOpen] = useState(false)
  const [pendingQuiz, setPendingQuiz] = useState<{
    testId: string
    questionCount: number
    timeLimitMinutes: number
    weakTopic: string
  } | null>(null)

  function handleGenerateQuiz(saveForLater: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await generateSmartQuizAction({
        saveForLater,
        topicKeys: focusTopicId ? [focusTopicId] : undefined,
        topicTitles: focusTopicTitle ? [focusTopicTitle] : undefined,
      })
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
        setError(result.error ?? 'Có lỗi xảy ra khi tạo bài luyện tập')
      }
    })
  }

  if (!profile) {
    return (
      <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/30 p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zeno/15">
            <Brain className="size-5 text-zeno" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Hồ sơ tư duy</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Làm ít nhất một bài kiểm tra để Zeno lập hồ sơ học tập của bạn.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const personaIcon = {
    'Nhanh nhạy nhưng ẩu': <Zap className="size-4 text-warning" />,
    'Cẩn thận - Ngâm lâu': <Clock className="size-4 text-info" />,
    'Thành thạo': <TrendingUp className="size-4 text-success" />,
    'Chắc chắn, tốc độ tốt': <TrendingUp className="size-4 text-success" />,
  }[profile.personaType] ?? <Brain className="size-4 text-zeno" />

  return (
    <>
      <div className="col-span-full rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-zeno text-zeno-foreground">
              <Brain className="size-4" aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hồ sơ tư duy</h3>
              <p className="text-xs text-muted-foreground">Phân tích từ Zeno</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
            {personaIcon}
            {profile.personaType}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge icon={<Clock className="size-3.5 text-info" />} label="Tốc độ TB" value={`${profile.avgSpeed}s/câu`} color="info" />
          <StatBadge icon={<AlertTriangle className="size-3.5 text-warning" />} label="Tỷ lệ ẩu" value={`${profile.carelessRate}%`} color="warning" />
          <StatBadge icon={<TrendingUp className="size-3.5 text-success" />} label="Điểm mạnh" value={`${profile.strengths.length} chủ đề`} color="success" />
          <StatBadge icon={<TrendingDown className="size-3.5 text-destructive" />} label="Cần cải thiện" value={`${profile.weaknesses.length} chủ đề`} color="danger" />
        </div>

        {profile.weaknesses.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Điểm yếu cần ôn:</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.weaknesses.slice(0, 5).map((topic) => (
                <span key={topic} className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {focusTopicTitle ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Bài luyện sẽ ưu tiên chủ đề: <strong className="text-foreground">{focusTopicTitle}</strong>
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => handleGenerateQuiz(false)}
            disabled={isPending}
            aria-busy={isPending || undefined}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zeno px-4 py-2.5 text-sm font-medium text-zeno-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Đang trộn đề...
              </>
            ) : (
              <>
                <BookOpen className="size-4" aria-hidden />
                Luyện tập từ kho đề ({PRACTICE_TIME_LIMIT_MINUTES} phút)
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleGenerateQuiz(true)}
            disabled={isPending}
            aria-busy={isPending || undefined}
            className="min-h-11 rounded-xl border border-zeno/40 px-4 py-2.5 text-sm font-medium text-zeno hover:bg-zeno/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Lưu vào &quot;Làm sau&quot;
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-center text-xs text-destructive">
            {error}
          </p>
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

type StatColor = 'info' | 'warning' | 'success' | 'danger'

const colorMap: Record<StatColor, string> = {
  info: 'bg-info/10',
  warning: 'bg-warning/10',
  success: 'bg-success/10',
  danger: 'bg-destructive/10',
}

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: StatColor
}) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl ${colorMap[color]} px-3 py-2`}>
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
