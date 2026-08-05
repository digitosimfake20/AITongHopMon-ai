'use client'

import { Trash2 } from 'lucide-react'
import { MultipleChoiceEditor } from '@/components/quiz/answer-editors/multiple-choice-editor'
import { ShortAnswerEditor } from '@/components/quiz/answer-editors/short-answer-editor'
import { TrueFalseEditor } from '@/components/quiz/answer-editors/true-false-editor'
import { MathInputArea } from '@/components/ui/math-input-area'
import { applyTypeDefaults, QUESTION_TYPE_LABELS, type ParsedQuestion, type QuestionType } from '@/lib/quiz/types'

const QUESTION_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE_GROUP', 'SHORT_ANSWER', 'ESSAY']

interface QuestionCardProps {
  question: ParsedQuestion
  index: number
  onChange: (id: string, patch: Partial<ParsedQuestion>) => void
  onDelete: (id: string) => void
}

export function QuestionCard({ question, index, onChange, onDelete }: QuestionCardProps) {
  function handlePatch(patch: Partial<ParsedQuestion>) {
    onChange(question.id, patch)
  }

  function handleTypeChange(nextType: QuestionType) {
    const { id: _id, ...rest } = applyTypeDefaults(question, nextType)
    onChange(question.id, rest)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex min-h-8 items-center rounded-full bg-secondary px-3 text-sm font-semibold text-foreground">
          Câu {index + 1}
        </span>

        <div className="flex items-center gap-2">
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="min-h-9 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground"
            aria-label={`Loại câu hỏi cho câu ${index + 1}`}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            aria-label={`Xóa câu ${index + 1}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Question content with math toolbar + live preview */}
      <div className="mt-3">
        <MathInputArea
          value={question.content}
          onChange={(v) => handlePatch({ content: v })}
          placeholder="Nhập nội dung câu hỏi... (dùng $...$ cho công thức toán)"
          rows={2}
          showPreview
          previewLayout="split"
          aria-label={`Nội dung câu ${index + 1}`}
        />
      </div>

      {question.type === 'MULTIPLE_CHOICE' && (
        <MultipleChoiceEditor question={question} onChange={handlePatch} />
      )}
      {question.type === 'TRUE_FALSE_GROUP' && (
        <TrueFalseEditor question={question} onChange={handlePatch} />
      )}
      {question.type === 'SHORT_ANSWER' && (
        <ShortAnswerEditor question={question} onChange={handlePatch} />
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[100px_1fr]">
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <label className="text-xs font-medium text-muted-foreground">Điểm</label>
            {question.type === 'TRUE_FALSE_GROUP' && (
              <span
                className="cursor-help text-[10px] text-muted-foreground underline decoration-dotted"
                title={
                  'Thang điểm Đúng/Sai (Bộ GD&ĐT):\n' +
                  '• 4/4 đúng → 100% điểm\n' +
                  '• 3/4 đúng → 50% điểm\n' +
                  '• 2/4 đúng → 25% điểm\n' +
                  '• 1/4 đúng → 10% điểm\n' +
                  '• 0/4 đúng → 0 điểm\n' +
                  'Tối đa 1.0 điểm'
                }
              >
                ⓘ
              </span>
            )}
          </div>
          <input
            type="number"
            min={0}
            max={question.type === 'TRUE_FALSE_GROUP' ? 1 : 10}
            step={0.1}
            value={question.points ?? 1}
            onChange={(e) => {
              const val = Number(e.target.value)
              const capped = question.type === 'TRUE_FALSE_GROUP' ? Math.min(1, val) : val
              handlePatch({ points: capped })
            }}
            className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
          {question.type === 'TRUE_FALSE_GROUP' && (question.points ?? 1) > 1 && (
            <p className="mt-1 text-[11px] text-destructive">Tối đa 1.0 điểm cho loại Đúng/Sai</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {question.type === 'ESSAY' ? 'Lời giải / Hướng dẫn chấm' : 'Giải thích (tùy chọn)'}
          </label>
          {/* Explanation with math toolbar + live preview (for ESSAY type, larger textarea) */}
          <MathInputArea
            value={question.explanation ?? ''}
            onChange={(v) => handlePatch({ explanation: v })}
            rows={question.type === 'ESSAY' ? 5 : 2}
            placeholder={
              question.type === 'ESSAY'
                ? 'Nhập lời giải chi tiết hoặc hướng dẫn chấm điểm...'
                : 'Lời giải chi tiết...'
            }
            showPreview={!!(question.explanation?.trim())}
            previewLayout="split"
            showToolbar={question.type !== 'MULTIPLE_CHOICE' && question.type !== 'TRUE_FALSE_GROUP'}
            aria-label="Giải thích"
          />
        </div>
      </div>
    </div>
  )
}
