'use client'

import { useState, useTransition } from 'react'
import { Brain, Zap, Clock, AlertTriangle, TrendingUp, TrendingDown, BookOpen, Loader2 } from 'lucide-react'
import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'
import { useRouter } from 'next/navigation'
import type { CognitiveProfileSummary } from '@/lib/dashboard-types'

interface AiProfileCardProps {
  profile: CognitiveProfileSummary | null
}

export function AiProfileCard({ profile }: AiProfileCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGenerateQuiz() {
    setError(null)
    startTransition(async () => {
      const result = await generateSmartQuizAction()
      if (result.success && result.data) {
        router.push(`/quiz/take/${result.data.testId}`)
      } else {
        setError(result.error ?? 'Có lỗi xảy ra khi tạo bài luyện tập')
      }
    })
  }

  if (!profile) {
    return (
      <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950">
            <Brain className="size-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              Hồ sơ Tư duy AI
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
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
  }[profile.personaType] ?? <Brain className="size-4 text-violet-500" />

  return (
    <div className="col-span-full rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-900 dark:from-violet-950/40 dark:to-indigo-950/40">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Brain className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Hồ sơ Tư duy AI
            </h3>
            <p className="text-xs text-slate-500">Phân tích từ Zeno</p>
          </div>
        </div>

        {/* Persona badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
          {personaIcon}
          {profile.personaType}
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge
          icon={<Clock className="size-3.5 text-blue-500" />}
          label="Tốc độ TB"
          value={`${profile.avgSpeed}s/câu`}
          color="blue"
        />
        <StatBadge
          icon={<AlertTriangle className="size-3.5 text-amber-500" />}
          label="Tỷ lệ ẩu"
          value={`${profile.carelessRate}%`}
          color="amber"
        />
        <StatBadge
          icon={<TrendingUp className="size-3.5 text-emerald-500" />}
          label="Điểm mạnh"
          value={`${profile.strengths.length} chủ đề`}
          color="emerald"
        />
        <StatBadge
          icon={<TrendingDown className="size-3.5 text-rose-500" />}
          label="Cần cải thiện"
          value={`${profile.weaknesses.length} chủ đề`}
          color="rose"
        />
      </div>

      {/* Weaknesses */}
      {profile.weaknesses.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Điểm yếu cần ôn:</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.weaknesses.slice(0, 5).map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA button */}
      <button
        onClick={handleGenerateQuiz}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Đang tạo bài luyện...
          </>
        ) : (
          <>
            <BookOpen className="size-4" />
            Luyện tập khắc phục điểm yếu (AI Tạo riêng)
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs text-rose-600">{error}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  )
}
