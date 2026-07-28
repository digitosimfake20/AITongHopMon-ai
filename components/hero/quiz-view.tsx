'use client'

import { Check, Clock3 } from 'lucide-react'
import { InlineMath } from 'react-katex'
import type { QuizQuestion } from '@/lib/types'
import { cn } from '@/lib/utils'
import 'katex/dist/katex.min.css'

interface QuizViewProps {
  question: QuizQuestion
  questionIndex: number
  totalQuestions: number
  selectedOptionId: string | null
  revealed: boolean
}

function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1)
          return <InlineMath key={i} math={math} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export function QuizView({
  question,
  questionIndex,
  totalQuestions,
  selectedOptionId,
  revealed,
}: QuizViewProps) {
  const progress = ((questionIndex + (revealed ? 1 : 0)) / totalQuestions) * 100

  return (
    <div className="flex h-full flex-col gap-5 p-5 sm:p-7">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
            {question.topic}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Toán 9 - Kiểm tra định kì
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          04:12
        </div>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        </div>
      </div>

      <div
        key={question.id}
        className="animate-slide-up-fade text-balance text-lg font-semibold leading-snug text-foreground sm:text-xl"
      >
        <MathText text={question.prompt} />
      </div>

      <ul className="flex flex-col gap-2.5" aria-label="Answer options">
        {question.options.map((option, index) => {
          const isSelected = selectedOptionId === option.id
          const isCorrectReveal = revealed && isSelected && option.correct

          return (
            <li key={`${question.id}-${option.id}`}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300',
                  isSelected
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card',
                  isCorrectReveal && 'border-success bg-success/10',
                )}
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-medium transition-colors duration-300',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground',
                    isCorrectReveal &&
                      'border-success bg-success text-success-foreground',
                  )}
                >
                  {isCorrectReveal ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    option.id.toUpperCase()
                  )}
                </span>
                <span className="text-sm text-card-foreground">
                  <MathText text={option.label} />
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-[11px] text-muted-foreground">
          Answers save automatically
        </span>
        <span
          className={cn(
            'rounded-lg px-3.5 py-2 text-xs font-medium transition-colors duration-300',
            selectedOptionId
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          {questionIndex + 1 === totalQuestions ? 'Submit' : 'Next question'}
        </span>
      </div>
    </div>
  )
}
