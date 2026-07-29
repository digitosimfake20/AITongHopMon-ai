'use client'

import { CheckCircle2, XCircle, Tag as TagIcon } from 'lucide-react'
import { MathText } from '@/components/quiz/math-text'
import type { QuestionResultRow } from '@/lib/quiz/submission-queries'
import { cn } from '@/lib/utils'
import { normalizeLatexDelimiters } from '@/lib/utils/katex-formatter'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

/** Normalise delimiter + safety-trim before passing to MathText */
function clean(text: unknown): string {
  if (text == null) return ''
  return normalizeLatexDelimiters(String(text))
}

// ---------------------------------------------------------------------------
// Helpers for parsing DB JSON
// ---------------------------------------------------------------------------

function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) =>
    clean(typeof o === 'object' && o !== null ? (o as { content?: string }).content ?? '' : o),
  )
}

function parseSubQuestions(raw: unknown): { label: string; content: string; correctAnswer: boolean }[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => ({
    label: String((o as { label?: unknown }).label ?? ''),
    content: clean((o as { content?: unknown }).content),
    correctAnswer: Boolean((o as { correctAnswer?: unknown }).correctAnswer),
  }))
}

// ---------------------------------------------------------------------------
// Multiple Choice Review
// ---------------------------------------------------------------------------

function MultipleChoiceReview({
  options,
  correctOption,
  studentAnswer,
}: {
  options: string[]
  correctOption: string | null
  studentAnswer: string
}) {
  const correctIdx = 'ABCD'.indexOf((correctOption ?? 'A').toUpperCase())
  const studentIdx = 'ABCD'.indexOf(studentAnswer.toUpperCase())

  return (
    <div className="mt-3 space-y-1.5">
      {options.map((opt, i) => {
        const isCorrect = i === correctIdx
        const isSelected = i === studentIdx
        const isWrong = isSelected && !isCorrect

        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
              isCorrect && 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/30',
              isWrong && 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30',
              !isCorrect && !isWrong && 'border-border bg-background',
            )}
          >
            <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground">
              {OPTION_LABELS[i]}
            </span>
            <span className="flex-1">
              <MathText text={opt} />
            </span>
            {isCorrect && <CheckCircle2 className="size-4 shrink-0 text-green-600" />}
            {isWrong && <XCircle className="size-4 shrink-0 text-red-600" />}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// True/False Group Review
// ---------------------------------------------------------------------------

function TrueFalseReview({
  subQuestions,
  correctStr,
  studentAnswer,
}: {
  subQuestions: { label: string; content: string; correctAnswer: boolean }[]
  correctStr: string | null
  studentAnswer: Record<string, boolean> | null
}) {
  const correctArr = correctStr?.split(',').map((s) => s.trim() === 'T') ?? []

  return (
    <div className="mt-3 space-y-1.5">
      {subQuestions.map((sq, i) => {
        const correct = correctArr[i] ?? sq.correctAnswer
        const student = studentAnswer ? studentAnswer[sq.label] : undefined
        const isAnswered = student !== undefined
        const isCorrect = isAnswered && student === correct

        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
              isCorrect && 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/30',
              isAnswered && !isCorrect && 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30',
              !isAnswered && 'border-border bg-background',
            )}
          >
            <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground">
              {sq.label})
            </span>
            <span className="flex-1"><MathText text={sq.content} /></span>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              {isAnswered && (
                <span className={student ? 'text-green-700' : 'text-red-700'}>
                  {student ? 'Đúng' : 'Sai'}
                </span>
              )}
              <span className="text-muted-foreground">→</span>
              <span className={correct ? 'text-green-700' : 'text-red-700'}>
                Đáp án: {correct ? 'Đúng' : 'Sai'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Short Answer Review
// ---------------------------------------------------------------------------

function ShortAnswerReview({
  correctOption,
  studentAnswer,
}: {
  correctOption: string
  studentAnswer: string
}) {
  const correct = studentAnswer.trim().toLowerCase() === correctOption.trim().toLowerCase()
  return (
    <div className="mt-3 space-y-1.5">
      <div className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        correct ? 'border-green-400 bg-green-50 dark:bg-green-950/30' : 'border-red-400 bg-red-50 dark:bg-red-950/30',
      )}>
        <span className="text-xs font-medium text-muted-foreground">Bạn trả lời: </span>
        <MathText text={studentAnswer} />
      </div>
      {!correct && (
        <div className="rounded-lg border border-green-400 bg-green-50 px-3 py-2 text-sm dark:bg-green-950/30">
          <span className="text-xs font-medium text-muted-foreground">Đáp án đúng: </span>
          <MathText text={correctOption} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main QuestionReview component
// ---------------------------------------------------------------------------

interface QuestionReviewProps {
  index: number
  result: QuestionResultRow
}

export function QuestionReview({ index, result }: QuestionReviewProps) {
  const studentStr =
    typeof result.studentAnswer === 'string'
      ? result.studentAnswer
      : result.selectedOption

  const studentAnswerObj =
    result.studentAnswer && typeof result.studentAnswer === 'object'
      ? (result.studentAnswer as Record<string, boolean>)
      : null

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        result.isCorrect
          ? 'border-green-300 dark:border-green-800'
          : 'border-red-300 dark:border-red-800',
      )}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {result.isCorrect ? (
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          ) : (
            <XCircle className="size-4 shrink-0 text-red-600" />
          )}
          <span className="text-sm font-semibold text-foreground">Câu {index + 1}</span>
          {result.topic && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <TagIcon className="size-2.5" aria-hidden />
              {result.topic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5">
            ⏱ {result.timeSpentSeconds}s
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5">
            {Number(result.pointsEarned).toFixed(2)}/{Number(result.points).toFixed(2)} điểm
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="mt-3 text-sm text-foreground">
        <MathText text={clean(result.content)} />
      </div>

      {/* Answer review */}
      {result.type === 'MULTIPLE_CHOICE' && (
        <MultipleChoiceReview
          options={parseOptions(result.options)}
          correctOption={result.correctOption}
          studentAnswer={clean(studentStr)}
        />
      )}
      {result.type === 'TRUE_FALSE_GROUP' && (
        <TrueFalseReview
          subQuestions={parseSubQuestions(result.options)}
          correctStr={result.correctOption}
          studentAnswer={studentAnswerObj}
        />
      )}
      {result.type === 'SHORT_ANSWER' && (
        <ShortAnswerReview
          correctOption={clean(result.correctOption)}
          studentAnswer={clean(studentStr)}
        />
      )}
      {result.type === 'ESSAY' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Bài làm của học sinh:</p>
            {studentStr?.trim() ? (
              <MathText text={clean(studentStr)} />
            ) : (
              <span className="italic text-muted-foreground">— Chưa nhập bài làm —</span>
            )}
          </div>
        </div>
      )}

      {/* Explanation / Teacher solution */}
      {result.explanation && (
        <div className={cn(
          'mt-3 rounded-lg border px-3 py-2.5 text-sm',
          result.type === 'ESSAY' || result.type === 'SHORT_ANSWER'
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
            : 'border-dashed border-border bg-muted/40',
        )}>
          <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {result.type === 'ESSAY' || result.type === 'SHORT_ANSWER' ? 'Đáp án & Hướng dẫn chấm:' : 'Giải thích:'}
          </p>
          <MathText text={clean(result.explanation)} />
        </div>
      )}
    </div>
  )
}
