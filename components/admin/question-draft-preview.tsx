'use client'

import { Eye, CheckCircle2 } from 'lucide-react'
import { MathText } from '@/components/quiz/math-text'
import type { QuestionDraft } from '@/lib/system-test/test-draft'
import { normalizeLatexDelimiters } from '@/lib/utils/katex-formatter'
import { cn } from '@/lib/utils'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function clean(text: string): string {
  return normalizeLatexDelimiters(text)
}

interface QuestionDraftPreviewProps {
  question: QuestionDraft
  index: number
  className?: string
}

/** Preview câu hỏi như học sinh thấy khi làm bài (KaTeX đã render). */
export function QuestionDraftPreview({ question, index, className }: QuestionDraftPreviewProps) {
  const correctIdx =
    question.type === 'MULTIPLE_CHOICE' && typeof question.correctAnswer === 'number'
      ? question.correctAnswer
      : -1

  return (
    <div className={cn('rounded-xl border border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20', className)}>
      <div className="flex items-center gap-2 border-b border-sky-200/80 px-4 py-2 dark:border-sky-900/50">
        <Eye className="size-3.5 text-sky-600" />
        <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">
          Xem trước — học sinh thấy (Câu {index + 1})
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{question.points} điểm</span>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="text-sm font-medium leading-relaxed text-foreground">
          <MathText text={clean(question.content) || '(chưa có nội dung)'} />
        </p>

        {question.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const isCorrect = i === correctIdx
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm',
                    isCorrect
                      ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                      : 'border-border bg-background',
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="flex-1">
                    <MathText text={clean(opt) || '—'} />
                  </span>
                  {isCorrect && (
                    <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-label="Đáp án đúng" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {question.type === 'TRUE_FALSE_GROUP' && (
          <div className="space-y-2">
            {question.subQuestions.map((sq, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-sm"
              >
                <span className="w-5 shrink-0 font-mono font-bold text-muted-foreground">
                  {sq.label})
                </span>
                <span className="flex-1">
                  <MathText text={clean(sq.content) || '—'} />
                </span>
                <div className="flex shrink-0 gap-1 rounded-lg bg-secondary p-1 text-xs text-muted-foreground">
                  <span className="rounded-md px-2 py-1">Đúng</span>
                  <span className="rounded-md px-2 py-1">Sai</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {question.type === 'SHORT_ANSWER' && (
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Ô trả lời ngắn…
            {question.correctAnswer != null && String(question.correctAnswer).trim() && (
              <p className="mt-2 border-t border-border pt-2 text-xs text-green-700 dark:text-green-400">
                Đáp án đúng: <MathText text={clean(String(question.correctAnswer))} />
              </p>
            )}
          </div>
        )}

        {question.type === 'ESSAY' && (
          <div className="min-h-20 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Ô tự luận…
          </div>
        )}

        {question.explanation.trim() && (
          <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Giải thích: </span>
            <MathText text={clean(question.explanation)} />
          </div>
        )}
      </div>
    </div>
  )
}

interface TestDraftPreviewProps {
  title: string
  durationMinutes: number
  questions: QuestionDraft[]
}

/** Xem trước toàn bộ đề như ngân hàng đề học sinh. */
export function TestDraftPreview({ title, durationMinutes, questions }: TestDraftPreviewProps) {
  return (
    <div className="space-y-4 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-slate-900/20 p-4 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="size-4 text-cyan-500" />
        <h3 className="font-mono text-sm font-semibold text-cyan-400">// preview</h3>
        <span className="text-xs text-muted-foreground">
          {title || '(Chưa có tiêu đề)'} · {durationMinutes} phút · {questions.length} câu
        </span>
      </div>
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionDraftPreview key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  )
}
