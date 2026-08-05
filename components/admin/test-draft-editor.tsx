'use client'

import { Plus } from 'lucide-react'
import { QuestionCard } from '@/components/quiz/question-card'
import { createEmptyQuestion, type ParsedQuestion } from '@/lib/quiz/types'
import {
  parsedToQuestionDraft,
  questionDraftToParsed,
  type TestDraft,
} from '@/lib/system-test/test-draft'
import { SYSTEM_SUBJECTS } from '@/lib/validations/system-test'
import { Button } from '@/components/ui/button'

interface TestDraftEditorProps {
  draft: TestDraft
  onChange: (draft: TestDraft) => void
  hideMetadata?: boolean
  hideDuration?: boolean
}

export function TestDraftEditor({
  draft,
  onChange,
  hideMetadata = false,
  hideDuration = false,
}: TestDraftEditorProps) {
  function patchQuestion(id: string, patch: Partial<ParsedQuestion>) {
    onChange({
      ...draft,
      questions: draft.questions.map((qDraft) => {
        if (qDraft.id !== id) return qDraft
        const merged = { ...questionDraftToParsed(qDraft), ...patch }
        return parsedToQuestionDraft(merged)
      }),
    })
  }

  function deleteQuestion(id: string) {
    if (draft.questions.length <= 1) return
    onChange({ ...draft, questions: draft.questions.filter((q) => q.id !== id) })
  }

  function addQuestion() {
    onChange({
      ...draft,
      questions: [...draft.questions, parsedToQuestionDraft(createEmptyQuestion())],
    })
  }

  return (
    <div className="space-y-4">
      {!hideMetadata && (
        <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề đề</label>
            <input
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              placeholder="Kiểm tra 15 phút — …"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Môn</label>
            <select
              value={draft.subject}
              onChange={(e) => onChange({ ...draft, subject: e.target.value })}
              className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {SYSTEM_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Khối</label>
            <input
              value={draft.grade}
              onChange={(e) => onChange({ ...draft, grade: e.target.value })}
              className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          {!hideDuration && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Thời gian (phút)</label>
              <input
                type="number"
                min={1}
                value={draft.durationMinutes}
                onChange={(e) =>
                  onChange({ ...draft, durationMinutes: Math.max(1, Number(e.target.value) || 1) })
                }
                className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Câu hỏi ({draft.questions.length})</p>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addQuestion}>
          <Plus className="size-3.5" />
          Thêm câu
        </Button>
      </div>

      <div className="space-y-4">
        {draft.questions.map((qDraft, index) => {
          const question = questionDraftToParsed(qDraft)
          return (
            <QuestionCard
              key={qDraft.id}
              question={question}
              index={index}
              onChange={patchQuestion}
              onDelete={deleteQuestion}
            />
          )
        })}
      </div>
    </div>
  )
}
