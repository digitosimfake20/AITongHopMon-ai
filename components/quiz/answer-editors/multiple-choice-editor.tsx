'use client'

import { useRef } from 'react'
import { MathText } from '@/components/quiz/math-text'
import { MathToolbar, MATH_PH } from '@/components/ui/math-toolbar'
import type { ParsedQuestion } from '@/lib/quiz/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

interface MultipleChoiceEditorProps {
  question: ParsedQuestion
  onChange: (patch: Partial<ParsedQuestion>) => void
}

export function MultipleChoiceEditor({ question, onChange }: MultipleChoiceEditorProps) {
  const options = question.options ?? ['', '', '', '']

  // Track whichever option input is currently (or was last) focused so the
  // shared toolbar knows where to insert.
  const focusedOption = useRef<{ el: HTMLInputElement; idx: number } | null>(null)

  function updateOption(optionIndex: number, value: string) {
    const next = [...options]
    next[optionIndex] = value
    onChange({ options: next })
  }

  function handleToolbarInsert(insertStr: string) {
    const focused = focusedOption.current
    if (!focused) return
    const { el, idx } = focused
    const current = options[idx] ?? ''

    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    const phIdx = insertStr.indexOf(MATH_PH)
    const cleanStr = insertStr.replace(MATH_PH, '')
    const newVal = current.slice(0, start) + cleanStr + current.slice(end)

    updateOption(idx, newVal)

    const newCursor = phIdx !== -1 ? start + phIdx : start + cleanStr.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    })
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Shared math toolbar for all option inputs */}
      <MathToolbar
        onInsert={handleToolbarInsert}
        className="rounded-lg border-b"
      />

      {options.map((option, optionIndex) => (
        <div
          key={optionIndex}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-3">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={question.correctAnswer === optionIndex}
              onChange={() => onChange({ correctAnswer: optionIndex })}
              className="size-4 shrink-0 accent-primary"
              aria-label={`Đáp án đúng là ${OPTION_LABELS[optionIndex]}`}
            />
            <span className="w-4 shrink-0 font-mono text-sm font-semibold text-muted-foreground">
              {OPTION_LABELS[optionIndex]}
            </span>
            <input
              value={option}
              onChange={(e) => updateOption(optionIndex, e.target.value)}
              onFocus={(e) => {
                focusedOption.current = { el: e.currentTarget, idx: optionIndex }
              }}
              placeholder={`Lựa chọn ${OPTION_LABELS[optionIndex]}`}
              className="min-h-11 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {option.trim() && (
            <div className="pl-7 text-sm text-muted-foreground sm:border-l sm:border-border sm:pl-3">
              <MathText text={option} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
