'use client'

import { AlertCircle, CheckCircle2, Shuffle } from 'lucide-react'
import type { ParsedQuestion } from '@/lib/quiz/types'

export function calcTotalPoints(questions: ParsedQuestion[]): number {
  return Math.round(questions.reduce((s, q) => s + (q.points ?? 1), 0) * 100) / 100
}

export function autoDistributePoints(questions: ParsedQuestion[]): ParsedQuestion[] {
  const n = questions.length
  if (n === 0) return questions
  const base = Math.round((10 / n) * 100) / 100
  const remainder = Math.round((10 - base * (n - 1)) * 100) / 100
  return questions.map((q, i) => ({ ...q, points: i === n - 1 ? Math.max(0.1, remainder) : Math.max(0.1, base) }))
}

interface ScoreBarProps {
  questions: ParsedQuestion[]
  onRedistribute: (updated: ParsedQuestion[]) => void
  label?: string
}

export function ScoreBar({ questions, onRedistribute, label }: ScoreBarProps) {
  const total = calcTotalPoints(questions)
  const isOver = total > 10
  const isExact = Math.abs(total - 10) < 0.005

  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        isOver
          ? 'border-destructive/60 bg-destructive/10'
          : isExact
            ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            : 'border-border bg-muted/40',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {isOver ? (
          <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden />
        ) : isExact ? (
          <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-hidden />
        ) : null}
        <span
          className={[
            'text-sm font-semibold',
            isOver ? 'text-destructive' : isExact ? 'text-green-700 dark:text-green-400' : 'text-foreground',
          ].join(' ')}
        >
          {label ? `${label}: ` : ''}Tổng điểm: {total}/10
        </span>
        {isOver && (
          <span className="text-xs text-destructive">— vượt quá 10 điểm, vui lòng điều chỉnh</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRedistribute(autoDistributePoints(questions))}
        disabled={questions.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        title="Chia đều 10 điểm cho tất cả câu hỏi"
      >
        <Shuffle className="size-3.5" aria-hidden />
        Tự động chia điểm đều
      </button>
    </div>
  )
}
