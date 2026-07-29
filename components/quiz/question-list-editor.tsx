'use client'

import { Plus } from 'lucide-react'
import { QuestionCard } from '@/components/quiz/question-card'
import { QuizUploadZone } from '@/components/quiz/quiz-upload-zone'
import { createEmptyQuestion, type ExtractedQuestion, type ParsedQuestion } from '@/lib/quiz/types'

function hydrateQuestion(extracted: ExtractedQuestion): ParsedQuestion {
  return {
    ...extracted,
    id: crypto.randomUUID(),
    subQuestions: extracted.subQuestions?.map((sq) => ({ ...sq, id: crypto.randomUUID() })),
  }
}

interface QuestionListEditorProps {
  questions: ParsedQuestion[]
  onChange: (questions: ParsedQuestion[]) => void
  uploadLabel?: string
}

/** Shared upload zone + question card list + "add question" control, reused by both Standard mode and each Adaptive Package tier. */
export function QuestionListEditor({ questions, onChange, uploadLabel }: QuestionListEditorProps) {
  function handleParsed(extracted: ExtractedQuestion[]) {
    onChange([...questions, ...extracted.map(hydrateQuestion)])
  }

  function updateQuestion(id: string, patch: Partial<ParsedQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  function deleteQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id))
  }

  return (
    <div className="space-y-4">
      <QuizUploadZone onParsed={handleParsed} label={uploadLabel} />

      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          onChange={updateQuestion}
          onDelete={deleteQuestion}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...questions, createEmptyQuestion()])}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" aria-hidden="true" />
        Thêm câu hỏi mới
      </button>
    </div>
  )
}
