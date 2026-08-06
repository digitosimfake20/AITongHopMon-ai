import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Trophy,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'
import { difficultyLabel } from '@/lib/adaptive/adaptive-logic'
import {
  resolveAdaptiveQuizStatus,
  resolveStandardQuizStatus,
} from '@/lib/quiz/quiz-display-status'

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

function formatDeadline(d: Date): string {
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface QuizCardProps {
  quiz: QuizBankItem
  isPractice?: boolean
}

export function QuizCard({ quiz, isPractice }: QuizCardProps) {
  if (quiz.isAdaptiveGroup && quiz.adaptiveProgress) {
    return <AdaptiveGroupQuizCard quiz={quiz} />
  }

  const status = resolveStandardQuizStatus(quiz)
  const score = quiz.latestSubmission?.score ?? null
  const attemptNum = quiz.latestSubmission?.attemptNumber ?? 0
  const resultId = quiz.latestSubmission?.id
  const canReview = status.isDone && quiz.allowReview && !!resultId
  const diffColor = DIFFICULTY_COLORS[quiz.difficultyLevel] ?? DIFFICULTY_COLORS.MEDIUM
  const diffLabel = DIFFICULTY_LABELS[quiz.difficultyLevel] ?? quiz.difficultyLevel

  const statusBanner = status.showNotStartedBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <Clock className="size-3.5 shrink-0" />
      Đề thi mở lúc {quiz.startTime && formatDeadline(quiz.startTime)}
    </div>
  ) : status.showOverdueBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="size-3.5 shrink-0" />
      Quá hạn
      {quiz.endTime && (
        <span className="opacity-80">· Hết hạn {formatDeadline(quiz.endTime)}</span>
      )}
    </div>
  ) : status.showMaxAttemptsBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Lock className="size-3.5 shrink-0" />
      Đã hoàn thành 2 lượt bắt buộc
    </div>
  ) : status.showCompletedBanner && status.progressLine ? (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
      <CheckCircle2 className="size-3.5 shrink-0" />
      Đã hoàn thành — {status.progressLine}
    </div>
  ) : null

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <h3 className="font-semibold leading-snug text-foreground">{quiz.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isPractice && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
              Luyện thêm
            </span>
          )}
          {quiz.classTestId && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
              Hệ thống
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          {quiz.subject}
        </span>
        {quiz.topic && (
          <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
            {quiz.topic}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          {quiz.timeLimitMinutes} phút
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <BookOpen className="size-3" aria-hidden />
          {quiz.questionCount} câu
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${diffColor}`}>
          {diffLabel}
        </span>
      </div>

      {statusBanner}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {status.isDone ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-600" aria-hidden />
            <span className="text-muted-foreground">
              {status.statusLabel}
              {score != null && (
                <>
                  {' '}
                  — <span className="font-semibold text-foreground">{score.toFixed(1)}/10</span>
                  {attemptNum > 0 && ` (lượt ${attemptNum})`}
                </>
              )}
            </span>
          </div>
        ) : (
          <Badge
            variant={status.statusLabel === 'Quá hạn' ? 'destructive' : 'secondary'}
            className="gap-1"
          >
            {status.statusLabel}
          </Badge>
        )}

        <div className="flex items-center gap-2">
          {canReview && (
            <Button
              variant="outline"
              className="min-h-9 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${resultId}`} />}
            >
              <Trophy className="size-3.5" />
              Xem kết quả
            </Button>
          )}
          {status.canTake ? (
            <Button
              className="min-h-9 gap-1.5"
              nativeButton={false}
              render={<Link href={`/quiz/take/${quiz.testId}`} />}
            >
              {status.isDone ? 'Làm lại bài' : 'Bắt đầu làm bài'}
            </Button>
          ) : status.statusLabel !== 'Quá hạn' ? (
            <Button className="min-h-9 gap-1.5" disabled>
              <Lock className="size-3.5" />
              Không thể làm
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AdaptiveGroupQuizCard({ quiz }: QuizCardProps) {
  const progress = quiz.adaptiveProgress!
  const status = resolveAdaptiveQuizStatus(quiz)

  const statusBanner = status.showNotStartedBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <Clock className="size-3.5 shrink-0" />
      Đề thi mở lúc {quiz.startTime && formatDeadline(quiz.startTime)}
    </div>
  ) : status.showOverdueBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="size-3.5 shrink-0" />
      Quá hạn
    </div>
  ) : status.progressLine ? (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
      <CheckCircle2 className="size-3.5 shrink-0" />
      {status.isDone ? 'Hoàn thành 2 lượt' : 'Tiến trình'}: {status.progressLine}
    </div>
  ) : progress.status === 'round2_pending' ? (
    <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
      <Sparkles className="size-3.5 shrink-0" />
      AI gợi ý lượt 2:{' '}
      <strong>
        {progress.round2Difficulty ? difficultyLabel(progress.round2Difficulty) : '…'}
      </strong>
    </div>
  ) : null

  const actionLabel =
    progress.status === 'not_started'
      ? 'Bắt đầu lượt 1 (TB)'
      : progress.status === 'round2_pending'
        ? `Làm lượt 2 (${progress.round2Difficulty ? difficultyLabel(progress.round2Difficulty) : ''})`
        : 'Hoàn thành'

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50/50 to-sky-50/30 p-5 shadow-sm dark:border-teal-900/40 dark:from-teal-950/20 dark:to-sky-950/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
          <h3 className="font-semibold leading-snug text-foreground">{quiz.title}</h3>
        </div>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 font-mono text-[11px] font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
          adaptive×2
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border px-2.5 py-0.5">{quiz.subject}</span>
        {quiz.topic && <span className="rounded-full border px-2.5 py-0.5">{quiz.topic}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div
          className={`rounded-lg border p-2.5 ${
            progress.round1SubmissionId
              ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
              : 'border-dashed border-border'
          }`}
        >
          <p className="font-medium text-foreground">Lượt 1 — Trung bình</p>
          {progress.round1Score != null ? (
            <p className="mt-0.5 text-muted-foreground">{progress.round1Score.toFixed(1)}/10</p>
          ) : (
            <p className="mt-0.5 text-muted-foreground">Chưa làm</p>
          )}
        </div>
        <div
          className={`rounded-lg border p-2.5 ${
            progress.round2SubmissionId
              ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
              : progress.round2Difficulty
                ? 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20'
                : 'border-dashed border-border opacity-60'
          }`}
        >
          <p className="font-medium text-foreground">
            Lượt 2 —{' '}
            {progress.round2Difficulty
              ? difficultyLabel(progress.round2Difficulty)
              : 'Chờ lượt 1'}
          </p>
          {progress.round2Score != null ? (
            <p className="mt-0.5 text-muted-foreground">{progress.round2Score.toFixed(1)}/10</p>
          ) : progress.round2Difficulty ? (
            <p className="mt-0.5 text-muted-foreground">Sẵn sàng</p>
          ) : (
            <p className="mt-0.5 text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {statusBanner}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Badge variant={status.isDone ? 'default' : 'secondary'}>
          {status.statusLabel}
        </Badge>
        <div className="flex gap-2">
          {progress.round1SubmissionId && quiz.allowReview && (
            <Button
              variant="outline"
              className="min-h-9 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${progress.round1SubmissionId}`} />}
            >
              Lượt 1
            </Button>
          )}
          {progress.round2SubmissionId && quiz.allowReview && (
            <Button
              variant="outline"
              className="min-h-9 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${progress.round2SubmissionId}`} />}
            >
              Lượt 2
            </Button>
          )}
          {status.canTake ? (
            <Button
              className="min-h-9 gap-1.5"
              nativeButton={false}
              render={<Link href={`/quiz/take/${progress.nextTestId}`} />}
            >
              {actionLabel}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button className="min-h-9 gap-1.5" disabled>
              <Lock className="size-3.5" />
              {status.statusLabel === 'Chưa mở' ? 'Chưa mở' : 'Không thể làm'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
