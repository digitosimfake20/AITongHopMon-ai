'use client'

import { MathInputArea } from '@/components/ui/math-input-area'
import type { ParsedQuestion } from '@/lib/quiz/types'

interface ShortAnswerEditorProps {
  question: ParsedQuestion
  onChange: (patch: Partial<ParsedQuestion>) => void
}

export function ShortAnswerEditor({ question, onChange }: ShortAnswerEditorProps) {
  const value = typeof question.correctAnswer === 'string' ? question.correctAnswer : ''

  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Đáp án đúng (số hoặc từ ngắn)
      </label>
      <MathInputArea
        value={value}
        onChange={(v) => onChange({ correctAnswer: v })}
        multiline={false}
        placeholder="Ví dụ: -6 hoặc $x = 10$"
        showPreview
        previewLayout="split"
        aria-label="Đáp án đúng"
      />
    </div>
  )
}
