'use client'

import { useId } from 'react'
import type { QuizMode } from '@/lib/quiz/types'

export interface QuizMeta {
  title: string
  subject: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimitMinutes: number
  description: string
}

interface QuizMetaFormProps {
  mode: QuizMode
  meta: QuizMeta
  onChange: (patch: Partial<QuizMeta>) => void
}

export function QuizMetaForm({ mode, meta, onChange }: QuizMetaFormProps) {
  const id = useId()
  const titleId = `${id}-title`
  const topicId = `${id}-topic`
  const subjectId = `${id}-subject`
  const timeId = `${id}-time`
  const difficultyId = `${id}-difficulty`
  const descriptionId = `${id}-description`

  const titleLabel =
    mode === 'ADAPTIVE_PACKAGE' ? 'Tên bộ đề thích ứng' : 'Tên đề kiểm tra'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-2">
        <label htmlFor={titleId} className="mb-1.5 block text-sm font-medium">
          {titleLabel}
        </label>
        <input
          id={titleId}
          value={meta.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Kiểm tra 15 phút - Chương 2"
          className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
        />
      </div>
      <div>
        <label htmlFor={topicId} className="mb-1.5 block text-sm font-medium">
          Chủ đề
        </label>
        <input
          id={topicId}
          value={meta.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder="Phân tích đa thức"
          className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
        />
      </div>
      <div>
        <label htmlFor={subjectId} className="mb-1.5 block text-sm font-medium">
          Môn học
        </label>
        <input
          id={subjectId}
          value={meta.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
        />
      </div>

      {mode === 'STANDARD' ? (
        <>
          <div>
            <label htmlFor={timeId} className="mb-1.5 block text-sm font-medium">
              Thời gian (phút)
            </label>
            <input
              id={timeId}
              type="number"
              min={1}
              max={300}
              value={meta.timeLimitMinutes}
              onChange={(e) => onChange({ timeLimitMinutes: Number(e.target.value) })}
              className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
            />
          </div>
          <div>
            <label htmlFor={difficultyId} className="mb-1.5 block text-sm font-medium">
              Độ khó
            </label>
            <select
              id={difficultyId}
              value={meta.difficulty}
              onChange={(e) => onChange({ difficulty: e.target.value as QuizMeta['difficulty'] })}
              className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>
        </>
      ) : (
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor={descriptionId} className="mb-1.5 block text-sm font-medium">
            Mô tả bộ đề (tùy chọn)
          </label>
          <textarea
            id={descriptionId}
            value={meta.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            placeholder="Học sinh sẽ được gợi ý làm đề Dễ/Trung bình/Khó dựa trên năng lực..."
            className="w-full resize-y rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
          />
        </div>
      )}
    </div>
  )
}
