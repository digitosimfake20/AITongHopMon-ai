'use client'

import type { QuizMode } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

const OPTIONS: { value: QuizMode; label: string; hint: string }[] = [
  { value: 'STANDARD', label: 'Đề đơn', hint: '1 đề kiểm tra duy nhất' },
  { value: 'ADAPTIVE_PACKAGE', label: 'Bộ đề thích ứng', hint: '3 đề: Dễ · Trung bình · Khó' },
]

interface QuizModeToggleProps {
  mode: QuizMode
  onChange: (mode: QuizMode) => void
}

export function QuizModeToggle({ mode, onChange }: QuizModeToggleProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-4 py-2.5 text-left transition-colors',
            mode === option.value
              ? 'border-primary bg-accent'
              : 'border-border bg-background hover:bg-secondary',
          )}
        >
          <span className="text-sm font-semibold text-foreground">{option.label}</span>
          <span className="text-xs text-muted-foreground">{option.hint}</span>
        </button>
      ))}
    </div>
  )
}
