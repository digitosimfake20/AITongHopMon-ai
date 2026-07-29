import Link from 'next/link'
import { BookOpen, CheckCircle2, Clock, Star, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'

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

interface QuizCardProps {
  quiz: QuizBankItem
}

export function QuizCard({ quiz }: QuizCardProps) {
  const isDone = !!quiz.latestSubmission
  const score = quiz.latestSubmission?.score ?? null
  const attemptNum = quiz.latestSubmission?.attemptNumber ?? 0
  const resultId = quiz.latestSubmission?.id

  const diffColor = DIFFICULTY_COLORS[quiz.difficultyLevel] ?? DIFFICULTY_COLORS.MEDIUM
  const diffLabel = DIFFICULTY_LABELS[quiz.difficultyLevel] ?? quiz.difficultyLevel

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <h3 className="font-semibold leading-snug text-foreground">{quiz.title}</h3>
        </div>
        {quiz.packageMode === 'ADAPTIVE_PACKAGE' && (
          <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
            Thích ứng
          </span>
        )}
      </div>

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          {quiz.timeLimitMinutes} phút
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <BookOpen className="size-3" aria-hidden />
          {quiz.questionCount} câu
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <Star className="size-3" aria-hidden />
          {quiz.totalPoints.toFixed(1)} điểm
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${diffColor}`}>
          {diffLabel}
        </span>
      </div>

      {/* Status + Action */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {isDone ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-600" aria-hidden />
            <span className="text-muted-foreground">
              Đã nộp ({attemptNum} lần) —{' '}
              <span className="font-semibold text-foreground">
                {score?.toFixed(1)}/10
              </span>
            </span>
          </div>
        ) : (
          <Badge variant="destructive" className="gap-1">
            Chưa làm
          </Badge>
        )}

        <div className="flex items-center gap-2">
          {isDone && resultId && (
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
          <Button
            className="min-h-9 gap-1.5"
            nativeButton={false}
            render={<Link href={`/quiz/take/${quiz.testId}`} />}
          >
            {isDone ? 'Làm lại' : 'Bắt đầu làm bài'}
          </Button>
        </div>
      </div>
    </article>
  )
}
