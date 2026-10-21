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
}

export function AiProfileCard({ profile }: AiProfileCardProps) {
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
      const result = await generateSmartQuizAction({ saveForLater })
      if (result.success && result.data) {
        if (saveForLater) {
          addSavedPractice({
            testId: result.data.testId,
            title: `Luyện tập — ${result.data.weakTopic}`,
            topic: result.data.weakTopic,
            questionCount: result.data.questionCount,
            timeLimitMinutes: result.data.timeLimitMinutes,
            savedAt: Date.now(),
          })
          toast.success('Đã thêm vào tab "Làm sau" — mở Ngân hàng đề để làm bất cứ lúc nào')
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950">
            <Brain className="size-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Hồ sơ Tư duy AI</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Hoàn thành ít nhất một bài kiểm tra để Zeno xây dựng hồ sơ học tập cá nhân của bạn.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const personaIcon = {
    'Nhanh nhạy nhưng ẩu': <Zap className="size-4 text-amber-500" />,
    'Cẩn thận - Ngâm lâu': <Clock className="size-4 text-blue-500" />,
    'Thành thạo': <TrendingUp className="size-4 text-emerald-500" />,
    'Chắc chắn, tốc độ tốt': <TrendingUp className="size-4 text-emerald-500" />,
  }[profile.personaType] ?? <Brain className="size-4 text-teal-500" />

  return (
    <>
      <div className="col-span-full rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 p-5 dark:border-teal-900 dark:from-teal-950/40 dark:to-sky-950/40">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Brain className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hồ sơ Tư duy AI</h3>
              <p className="text-xs text-muted-foreground">Phân tích từ Zeno</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm dark:bg-slate-800">
            {personaIcon}
            {profile.personaType}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge icon={<Clock className="size-3.5 text-blue-500" />} label="Tốc độ TB" value={`${profile.avgSpeed}s/câu`} color="blue" />
          <StatBadge icon={<AlertTriangle className="size-3.5 text-amber-500" />} label="Tỷ lệ ẩu" value={`${profile.carelessRate}%`} color="amber" />
          <StatBadge icon={<TrendingUp className="size-3.5 text-emerald-500" />} label="Điểm mạnh" value={`${profile.strengths.length} chủ đề`} color="emerald" />
          <StatBadge icon={<TrendingDown className="size-3.5 text-rose-500" />} label="Cần cải thiện" value={`${profile.weaknesses.length} chủ đề`} color="rose" />
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => handleGenerateQuiz(false)}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang trộn đề...
              </>
            ) : (
              <>
                <BookOpen className="size-4" />
                Luyện tập từ kho đề ({PRACTICE_TIME_LIMIT_MINUTES} phút)
              </>
            )}
          </button>
          <button
            onClick={() => handleGenerateQuiz(true)}
            disabled={isPending}
            className="rounded-xl border border-teal-300 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/30"
          >
            Lưu vào &quot;Làm sau&quot;
          </button>
        </div>

        {error && <p className="mt-2 text-center text-xs text-rose-600">{error}</p>}
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

type StatColor = 'blue' | 'amber' | 'emerald' | 'rose'

const colorMap: Record<StatColor, string> = {
  blue: 'bg-blue-50 dark:bg-blue-950/50',
  amber: 'bg-amber-50 dark:bg-amber-950/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50',
  rose: 'bg-rose-50 dark:bg-rose-950/50',
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
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
