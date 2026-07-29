'use client'

import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MathText } from '@/components/quiz/math-text'
import { MathToolbar, MATH_PH } from '@/components/ui/math-toolbar'
import { createSubQuestion, type ParsedQuestion } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

interface TrueFalseEditorProps {
  question: ParsedQuestion
  onChange: (patch: Partial<ParsedQuestion>) => void
}

export function TrueFalseEditor({ question, onChange }: TrueFalseEditorProps) {
  const subQuestions = question.subQuestions ?? []

  // Track whichever sub-question input is currently focused
  const focusedSub = useRef<{ el: HTMLInputElement; id: string } | null>(null)

  function updateSub(id: string, patch: Partial<(typeof subQuestions)[number]>) {
    onChange({ subQuestions: subQuestions.map((sq) => (sq.id === id ? { ...sq, ...patch } : sq)) })
  }

  function deleteSub(id: string) {
    onChange({ subQuestions: subQuestions.filter((sq) => sq.id !== id) })
  }

  function addSub() {
    const nextLabel = String.fromCharCode(97 + subQuestions.length)
    onChange({ subQuestions: [...subQuestions, createSubQuestion(nextLabel)] })
  }

  function handleToolbarInsert(insertStr: string) {
    const focused = focusedSub.current
    if (!focused) return
    const { el, id } = focused
    const sq = subQuestions.find((s) => s.id === id)
    if (!sq) return
    const current = sq.content

    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    const phIdx = insertStr.indexOf(MATH_PH)
    const cleanStr = insertStr.replace(MATH_PH, '')
    const newContent = current.slice(0, start) + cleanStr + current.slice(end)

    updateSub(id, { content: newContent })

    const newCursor = phIdx !== -1 ? start + phIdx : start + cleanStr.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    })
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Shared math toolbar for all sub-question inputs */}
      <MathToolbar
        onInsert={handleToolbarInsert}
        className="rounded-lg border-b"
      />

      {subQuestions.map((sq) => (
        <div key={sq.id} className="rounded-lg border border-border bg-background">
          <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
            <span className="w-6 shrink-0 font-mono text-sm font-semibold text-muted-foreground">
              {sq.label})
            </span>
            <input
              value={sq.content}
              onChange={(e) => updateSub(sq.id, { content: e.target.value })}
              onFocus={(e) => {
                focusedSub.current = { el: e.currentTarget, id: sq.id }
              }}
              placeholder="Nội dung mệnh đề..."
              className="min-h-11 flex-1 bg-transparent text-sm outline-none"
            />
            {sq.correctAnswer === undefined && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                Chưa xác định
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => updateSub(sq.id, { correctAnswer: true })}
                className={cn(
                  'min-h-9 rounded-md px-3 text-xs font-medium transition-colors',
                  sq.correctAnswer === true ? 'bg-success text-success-foreground' : 'text-muted-foreground',
                )}
              >
                Đúng
              </button>
              <button
                type="button"
                onClick={() => updateSub(sq.id, { correctAnswer: false })}
                className={cn(
                  'min-h-9 rounded-md px-3 text-xs font-medium transition-colors',
                  sq.correctAnswer === false ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground',
                )}
              >
                Sai
              </button>
            </div>
            <button
              type="button"
              onClick={() => deleteSub(sq.id)}
              aria-label={`Xóa ý ${sq.label}`}
              className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Math preview always visible below the row */}
          {sq.content.trim() && (
            <div className="border-t border-border px-4 py-2 pl-9 text-sm text-muted-foreground">
              <MathText text={sq.content} />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addSub}
        className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Thêm ý
      </button>
    </div>
  )
}
