'use client'

import { useState } from 'react'
import { QuestionListEditor } from '@/components/quiz/question-list-editor'
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS, type DifficultyLevel, type ParsedQuestion } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

export interface TierState {
  timeLimitMinutes: number
  questions: ParsedQuestion[]
}

export type TiersState = Record<DifficultyLevel, TierState>

export function createEmptyTiers(): TiersState {
  return {
    EASY: { timeLimitMinutes: 15, questions: [] },
    MEDIUM: { timeLimitMinutes: 15, questions: [] },
    HARD: { timeLimitMinutes: 15, questions: [] },
  }
}

interface AdaptivePackageEditorProps {
  tiers: TiersState
  onChange: (tiers: TiersState) => void
}

export function AdaptivePackageEditor({ tiers, onChange }: AdaptivePackageEditorProps) {
  const [activeTier, setActiveTier] = useState<DifficultyLevel>('MEDIUM')
  const current = tiers[activeTier]

  function updateTier(patch: Partial<TierState>) {
    onChange({ ...tiers, [activeTier]: { ...current, ...patch } })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {DIFFICULTY_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setActiveTier(level)}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
              activeTier === level
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary',
            )}
          >
            {DIFFICULTY_LABELS[level]}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                activeTier === level ? 'bg-primary-foreground/20' : 'bg-secondary',
              )}
            >
              {tiers[level].questions.length}
            </span>
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Thời gian làm bài — mức {DIFFICULTY_LABELS[activeTier]} (phút)
        </label>
        <input
          type="number"
          min={1}
          max={300}
          value={current.timeLimitMinutes}
          onChange={(e) => updateTier({ timeLimitMinutes: Number(e.target.value) })}
          className="min-h-11 w-full max-w-[140px] rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>

      <QuestionListEditor
        questions={current.questions}
        onChange={(questions) => updateTier({ questions })}
        uploadLabel={`Tải lên câu hỏi mức ${DIFFICULTY_LABELS[activeTier]}`}
      />
    </div>
  )
}
