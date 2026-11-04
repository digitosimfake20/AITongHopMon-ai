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
  EASY: 'bg-success/15 text-success',
  MEDIUM: 'bg-warning/15 text-warning',
  HARD: 'bg-destructive/15 text-destructive',
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
      <Clock className="size-3.5 shrink-0" aria-hidden />
      Đề thi mở lúc {quiz.startTime && formatDeadline(quiz.startTime)}
    </div>
  ) : status.showOverdueBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      Quá hạn
      {quiz.endTime && (
        <span className="opacity-80">· Hết hạn {formatDeadline(quiz.endTime)}</span>
      )}
    </div>
  ) : status.showMaxAttemptsBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      Đã hoàn thành 2 lượt bắt buộc
    </div>
  ) : status.showCompletedBanner && status.progressLine ? (
    <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
      Đã hoàn thành · {status.progressLine}
    </div>
  ) : null

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <h3 className="font-semibold leading-snug text-foreground">{quiz.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isPractice && (
            <span className="rounded-md bg-zeno/15 px-2 py-0.5 text-xs font-medium text-zeno">
              Luyện thêm
            </span>
          )}
          {quiz.classTestId && (
            <span className="rounded-md bg-info/15 px-2 py-0.5 text-xs font-medium text-info">
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
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            <span className="text-muted-foreground">
              {status.statusLabel}
              {score != null && (
                <>
                  {' '}
                  · <span className="font-semibold text-foreground">{score.toFixed(1)}/10</span>
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
              className="min-h-11 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${resultId}`} prefetch={false} />}
            >
              <Trophy className="size-3.5" />
              Xem kết quả
            </Button>
          )}
          {status.canTake ? (
            <Button
              className="min-h-11 gap-1.5"
              nativeButton={false}
              render={<Link href={`/quiz/take/${quiz.testId}`} prefetch={false} />}
            >
              {status.isDone ? 'Làm lại bài' : 'Bắt đầu làm bài'}
            </Button>
          ) : status.statusLabel !== 'Quá hạn' ? (
            <Button className="min-h-11 gap-1.5" disabled>
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
      <Clock className="size-3.5 shrink-0" aria-hidden />
      Đề thi mở lúc {quiz.startTime && formatDeadline(quiz.startTime)}
    </div>
  ) : status.showOverdueBanner ? (
    <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      Quá hạn
    </div>
  ) : status.progressLine ? (
    <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
      {status.isDone ? 'Hoàn thành 2 lượt' : 'Tiến trình'}: {status.progressLine}
    </div>
  ) : progress.status === 'round2_pending' ? (
    <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
      <Sparkles className="size-3.5 shrink-0" aria-hidden />
      Gợi ý lượt 2:{' '}
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
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-zeno" aria-hidden />
          <h3 className="font-semibold leading-snug text-foreground">{quiz.title}</h3>
        </div>
        <span className="rounded-md bg-zeno/15 px-2 py-0.5 text-xs font-medium text-zeno">
          Phân hóa 2 lượt
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
          <p className="font-medium text-foreground">Lượt 1 · Trung bình</p>
          {progress.round1Score != null ? (
            <p className="mt-0.5 text-muted-foreground">{progress.round1Score.toFixed(1)}/10</p>
          ) : (
            <p className="mt-0.5 text-muted-foreground">Chưa làm</p>
          )}
        </div>
        <div
          className={`rounded-lg border p-2.5 ${
            progress.round2SubmissionId
              ? 'border-success/40 bg-success/10'
              : progress.round2Difficulty
                ? 'border-info/40 bg-info/10'
                : 'border-dashed border-border opacity-60'
          }`}
        >
          <p className="font-medium text-foreground">
            Lượt 2 ·{' '}
            {progress.round2Difficulty
              ? difficultyLabel(progress.round2Difficulty)
              : 'Chờ lượt 1'}
          </p>
          {progress.round2Score != null ? (
            <p className="mt-0.5 text-muted-foreground">{progress.round2Score.toFixed(1)}/10</p>
          ) : progress.round2Difficulty ? (
            <p className="mt-0.5 text-muted-foreground">Sẵn sàng</p>
          ) : (
            <p className="mt-0.5 text-muted-foreground">Chưa mở</p>
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
              className="min-h-11 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${progress.round1SubmissionId}`} prefetch={false} />}
            >
              Lượt 1
            </Button>
          )}
          {progress.round2SubmissionId && quiz.allowReview && (
            <Button
              variant="outline"
              className="min-h-11 text-xs"
              nativeButton={false}
              render={<Link href={`/quiz/result/${progress.round2SubmissionId}`} prefetch={false} />}
            >
              Lượt 2
            </Button>
          )}
          {status.canTake ? (
            <Button
              className="min-h-11 gap-1.5"
              nativeButton={false}
              render={<Link href={`/quiz/take/${progress.nextTestId}`} prefetch={false} />}
            >
              {actionLabel}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button className="min-h-11 gap-1.5" disabled>
              <Lock className="size-3.5" />
              {status.statusLabel === 'Chưa mở' ? 'Chưa mở' : 'Không thể làm'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
