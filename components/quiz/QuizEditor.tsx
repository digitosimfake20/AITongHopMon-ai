'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdaptivePackageEditor,
  createEmptyTiers,
  type TiersState,
} from '@/components/quiz/adaptive-package-editor'
import { QuestionListEditor } from '@/components/quiz/question-list-editor'
import { QuizMetaForm, type QuizMeta } from '@/components/quiz/quiz-meta-form'
import { QuizModeToggle } from '@/components/quiz/quiz-mode-toggle'
import { ScoreBar, calcTotalPoints } from '@/components/quiz/score-bar'
import { Button } from '@/components/ui/button'
import { saveQuizPackageAction, updateQuizPackageAction } from '@/lib/quiz/actions'
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS, type ParsedQuestion, type QuizMode } from '@/lib/quiz/types'

export interface QuizEditorInitialData {
  mode: QuizMode
  title: string
  subject: string
  topic: string
  description?: string
  /** For STANDARD mode */
  timeLimitMinutes?: number
  questions?: ParsedQuestion[]
  /** For ADAPTIVE_PACKAGE mode */
  tiers?: {
    EASY: { timeLimitMinutes: number; questions: ParsedQuestion[] }
    MEDIUM: { timeLimitMinutes: number; questions: ParsedQuestion[] }
    HARD: { timeLimitMinutes: number; questions: ParsedQuestion[] }
  }
}

interface QuizEditorProps {
  classId: string
  /** Present in edit mode — omit for create mode. */
  packageId?: string
  initialData?: QuizEditorInitialData
}

function validateQuestion(question: ParsedQuestion, label: string): string | null {
  if (!question.content.trim()) return `${label} chưa có nội dung`

  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      const options = question.options ?? []
      if (options.length !== 4 || options.some((opt) => !opt.trim())) {
        return `${label} cần đầy đủ 4 lựa chọn A, B, C, D`
      }
      return null
    }
    case 'TRUE_FALSE_GROUP': {
      const subQuestions = question.subQuestions ?? []
      if (subQuestions.length === 0 || subQuestions.some((sq) => !sq.content.trim())) {
        return `${label} cần ít nhất 1 ý Đúng/Sai đầy đủ nội dung`
      }
      if (subQuestions.some((sq) => sq.correctAnswer === undefined)) {
        return `${label} còn ý chưa xác định Đúng/Sai — vui lòng chọn thủ công`
      }
      return null
    }
    case 'SHORT_ANSWER': {
      if (typeof question.correctAnswer !== 'string' || !question.correctAnswer.trim()) {
        return `${label} cần nhập đáp án đúng`
      }
      return null
    }
    case 'ESSAY':
      return null
  }
}

function validateQuestions(questions: ParsedQuestion[], prefix: string): string | null {
  if (questions.length === 0) return `${prefix} cần ít nhất 1 câu hỏi`
  for (let i = 0; i < questions.length; i++) {
    const error = validateQuestion(questions[i], `${prefix} — Câu ${i + 1}`)
    if (error) return error
  }
  return null
}

function stripQuestionIds(questions: ParsedQuestion[]) {
  return questions.map(({ id: _id, subQuestions, ...question }) => ({
    ...question,
    subQuestions: subQuestions?.map(({ id: _sqId, ...sq }) => sq),
  }))
}

function buildMeta(init?: QuizEditorInitialData): QuizMeta {
  return {
    title: init?.title ?? '',
    subject: init?.subject ?? 'Toán',
    topic: init?.topic ?? '',
    difficulty: 'medium',
    timeLimitMinutes: init?.timeLimitMinutes ?? 15,
    description: init?.description ?? '',
  }
}

function buildTiers(init?: QuizEditorInitialData): TiersState {
  if (!init?.tiers) return createEmptyTiers()
  return {
    EASY: { timeLimitMinutes: init.tiers.EASY.timeLimitMinutes, questions: init.tiers.EASY.questions },
    MEDIUM: { timeLimitMinutes: init.tiers.MEDIUM.timeLimitMinutes, questions: init.tiers.MEDIUM.questions },
    HARD: { timeLimitMinutes: init.tiers.HARD.timeLimitMinutes, questions: init.tiers.HARD.questions },
  }
}

export function QuizEditor({ classId, packageId, initialData }: QuizEditorProps) {
  const router = useRouter()
  const isEditMode = Boolean(packageId)

  const [mode, setMode] = useState<QuizMode>(initialData?.mode ?? 'STANDARD')
  const [meta, setMeta] = useState<QuizMeta>(buildMeta(initialData))
  const [questions, setQuestions] = useState<ParsedQuestion[]>(initialData?.questions ?? [])
  const [tiers, setTiers] = useState<TiersState>(buildTiers(initialData))
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!meta.title.trim()) {
      toast.error(mode === 'ADAPTIVE_PACKAGE' ? 'Vui lòng nhập tên bộ đề' : 'Vui lòng nhập tên đề kiểm tra')
      return
    }
    if (!meta.topic.trim()) {
      toast.error('Vui lòng nhập chủ đề')
      return
    }

    if (mode === 'STANDARD') {
      const error = validateQuestions(questions, 'Đề kiểm tra')
      if (error) { toast.error(error); return }
      if (calcTotalPoints(questions) > 10) {
        toast.error('Tổng điểm vượt quá 10. Vui lòng điều chỉnh điểm hoặc dùng "Tự động chia điểm đều".')
        return
      }
    } else {
      for (const level of DIFFICULTY_LEVELS) {
        const error = validateQuestions(tiers[level].questions, `Mức ${DIFFICULTY_LABELS[level]}`)
        if (error) { toast.error(error); return }
        if (calcTotalPoints(tiers[level].questions) > 10) {
          toast.error(`Tổng điểm mức ${DIFFICULTY_LABELS[level]} vượt quá 10. Vui lòng điều chỉnh.`)
          return
        }
      }
    }

    setIsSaving(true)

    const payload =
      mode === 'STANDARD'
        ? {
            mode: 'STANDARD' as const,
            classId,
            title: meta.title,
            subject: meta.subject,
            topic: meta.topic,
            timeLimitMinutes: meta.timeLimitMinutes,
            questions: stripQuestionIds(questions),
          }
        : {
            mode: 'ADAPTIVE_PACKAGE' as const,
            classId,
            title: meta.title,
            subject: meta.subject,
            topic: meta.topic,
            description: meta.description || undefined,
            easy: { timeLimitMinutes: tiers.EASY.timeLimitMinutes, questions: stripQuestionIds(tiers.EASY.questions) },
            medium: { timeLimitMinutes: tiers.MEDIUM.timeLimitMinutes, questions: stripQuestionIds(tiers.MEDIUM.questions) },
            hard: { timeLimitMinutes: tiers.HARD.timeLimitMinutes, questions: stripQuestionIds(tiers.HARD.questions) },
          }

    const result = isEditMode && packageId
      ? await updateQuizPackageAction(packageId, payload)
      : await saveQuizPackageAction(payload)

    if (result.success) {
      toast.success(
        isEditMode
          ? 'Đã cập nhật đề kiểm tra'
          : mode === 'ADAPTIVE_PACKAGE'
            ? 'Đã lưu bộ đề thích ứng'
            : 'Đã lưu đề kiểm tra',
      )
      router.push('/teacher/assignments')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Không thể lưu đề kiểm tra')
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      {!isEditMode && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Loại đề kiểm tra</h2>
          <div className="mt-4">
            <QuizModeToggle mode={mode} onChange={setMode} />
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Chỉnh sửa đề kiểm tra. Lưu ý: không thể chỉnh sửa nếu học sinh đã nộp bài.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Thông tin đề kiểm tra</h2>
        <div className="mt-4">
          <QuizMetaForm
            mode={mode}
            meta={meta}
            onChange={(patch) => setMeta((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>

      {mode === 'STANDARD' ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Câu hỏi</h2>
          <div className="mt-4 space-y-4">
            <QuestionListEditor questions={questions} onChange={setQuestions} />
            {questions.length > 0 && (
              <ScoreBar questions={questions} onRedistribute={setQuestions} />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Câu hỏi theo từng mức độ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Soạn riêng bộ câu hỏi cho từng mức Dễ / Trung bình / Khó.
          </p>
          <div className="mt-4">
            <AdaptivePackageEditor tiers={tiers} onChange={setTiers} />
          </div>
        </div>
      )}

      {(() => {
        const scoreOver =
          mode === 'STANDARD'
            ? calcTotalPoints(questions) > 10
            : DIFFICULTY_LEVELS.some((l) => calcTotalPoints(tiers[l].questions) > 10)
        return (
          <div className="flex justify-end gap-3">
            {isEditMode && (
              <Button
                variant="outline"
                onClick={() => router.push('/teacher/assignments')}
                disabled={isSaving}
              >
                Hủy
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || scoreOver}
              className="min-h-11 px-6"
              title={scoreOver ? 'Tổng điểm vượt quá 10' : undefined}
            >
              <Save className="size-4" aria-hidden="true" />
              {isSaving
                ? 'Đang lưu...'
                : isEditMode
                  ? 'Cập nhật đề kiểm tra'
                  : mode === 'ADAPTIVE_PACKAGE'
                    ? 'Lưu bộ đề thích ứng'
                    : 'Lưu đề kiểm tra'}
            </Button>
          </div>
        )
      })()}
    </div>
  )
}
