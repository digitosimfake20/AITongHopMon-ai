import { notFound, redirect } from 'next/navigation'
import { Clock, Star, Target, TrendingUp } from 'lucide-react'
import { getSessionUser } from '@/lib/auth/session'
import { getSubmissionResult } from '@/lib/quiz/submission-queries'
import { QuestionReview } from '@/components/quiz/result/question-review'
import { AIInsightsCard } from '@/components/quiz/result/ai-insights-card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}p ${s}s` : `${s}s`
}

function scoreGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 9) return { label: 'Xuất sắc', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-950/40' }
  if (score >= 8) return { label: 'Giỏi', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40' }
  if (score >= 6.5) return { label: 'Khá', color: 'text-yellow-700', bg: 'bg-yellow-100 dark:bg-yellow-950/40' }
  if (score >= 5) return { label: 'Trung bình', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-950/40' }
  return { label: 'Yếu', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40' }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuizResultPage({ params }: PageProps) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user) redirect('/login')

  const result = await getSubmissionResult(id, user.id)
  if (!result) notFound()

  const grade = scoreGrade(result.score)
  const accuracy = result.totalQuestions > 0
    ? Math.round((result.correctCount / result.totalQuestions) * 100)
    : 0

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-6 ${grade.bg}`}>
        <p className="text-sm font-medium text-muted-foreground">{result.testTitle}</p>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Score */}
          <div className="text-center sm:text-left">
            <span className={`text-6xl font-extrabold tabular-nums tracking-tight ${grade.color}`}>
              {result.score.toFixed(1)}
            </span>
            <span className="ml-1 text-2xl font-semibold text-muted-foreground">/10</span>
            <div className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${grade.color}`}>
              {grade.label}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatBadge icon={<Clock className="size-4" />} label="Thời gian" value={formatTime(result.timeSpentSeconds)} />
            <StatBadge icon={<Target className="size-4" />} label="Đúng" value={`${result.correctCount}/${result.totalQuestions}`} />
            <StatBadge icon={<TrendingUp className="size-4" />} label="Độ chính xác" value={`${accuracy}%`} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Lần thử #{result.attemptNumber}</span>
          <span>·</span>
          <span>Nộp lúc {new Date(result.submittedAt).toLocaleString('vi-VN')}</span>
          <span>·</span>
          <span className="capitalize">{result.difficultyLevel}</span>
        </div>
      </div>

      {/* ── AI Insights ──────────────────────────────────── */}
      <AIInsightsCard
        submissionId={id}
        initialAnalysis={result.aiFeedbackSummary}
      />

      {/* ── Detailed Review ───────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Star className="size-5 text-primary" aria-hidden />
          Xem lại chi tiết
        </h2>
        <div className="space-y-4">
          {result.questionResults.map((qr, i) => (
            <QuestionReview key={qr.questionId} index={i} result={qr} />
          ))}
        </div>
      </section>
    </main>
  )
}

function StatBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-background/60 px-3 py-2 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="mt-1 text-lg font-bold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
