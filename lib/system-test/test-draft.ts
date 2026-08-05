import { publishSystemTestSchema } from '@/lib/validations/system-test'
import type { ParsedQuestion } from '@/lib/quiz/types'
import { applyTypeDefaults } from '@/lib/quiz/types'

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE_GROUP' | 'SHORT_ANSWER' | 'ESSAY'

export interface SubQuestionDraft {
  id?: string
  label: string
  content: string
  correctAnswer: boolean
}

export interface QuestionDraft {
  id: string
  type: QuestionType
  content: string
  topic: string
  options: [string, string, string, string]
  subQuestions: SubQuestionDraft[]
  correctAnswer: string | number
  explanation: string
  points: number
}

export interface TestDraft {
  title: string
  subject: string
  grade: string
  durationMinutes: number
  questions: QuestionDraft[]
}

export type ParseResult =
  | { ok: true; data: TestDraft }
  | { ok: false; error: string }

let _qId = 0
export function newQuestionId(): string {
  _qId += 1
  return `q-${Date.now()}-${_qId}`
}

export function emptyQuestion(type: QuestionType = 'MULTIPLE_CHOICE'): QuestionDraft {
  return {
    id: newQuestionId(),
    type,
    content: '',
    topic: '',
    options: ['', '', '', ''],
    subQuestions: [
      { label: 'a', content: '', correctAnswer: true },
      { label: 'b', content: '', correctAnswer: false },
    ],
    correctAnswer: 0,
    explanation: '',
    points: 1,
  }
}

export function emptyTestDraft(): TestDraft {
  return {
    title: '',
    subject: 'Toán',
    grade: '8',
    durationMinutes: 15,
    questions: [emptyQuestion()],
  }
}

function normalizeQuestion(raw: Record<string, unknown>, index: number): QuestionDraft {
  const type = (raw.type as QuestionType) ?? 'MULTIPLE_CHOICE'
  const opts = Array.isArray(raw.options) ? raw.options.map(String) : []
  while (opts.length < 4) opts.push('')
  const subs = Array.isArray(raw.subQuestions)
    ? raw.subQuestions.map((sq, i) => {
        const o = sq as Record<string, unknown>
        return {
          label: String(o.label ?? String.fromCharCode(97 + i)),
          content: String(o.content ?? ''),
          correctAnswer: Boolean(o.correctAnswer),
        }
      })
    : [
        { label: 'a', content: '', correctAnswer: true },
        { label: 'b', content: '', correctAnswer: false },
      ]

  let correctAnswer: string | number = 0
  if (type === 'MULTIPLE_CHOICE') {
    correctAnswer =
      typeof raw.correctAnswer === 'number'
        ? raw.correctAnswer
        : typeof raw.correctAnswer === 'string' && /^[A-D]$/i.test(raw.correctAnswer)
          ? raw.correctAnswer.toUpperCase().charCodeAt(0) - 65
          : 0
  } else if (type === 'SHORT_ANSWER') {
    correctAnswer = String(raw.correctAnswer ?? '')
  }

  return {
    id: newQuestionId(),
    type,
    content: String(raw.content ?? ''),
    topic: String(raw.topic ?? ''),
    options: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? '', opts[3] ?? ''] as [
      string,
      string,
      string,
      string,
    ],
    subQuestions: subs,
    correctAnswer,
    explanation: String(raw.explanation ?? ''),
    points: typeof raw.points === 'number' && raw.points > 0 ? raw.points : 1,
  }
}

export function parseTestJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'JSON trống — hãy dán hoặc upload file .json' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : 'Cú pháp JSON không hợp lệ'
    return { ok: false, error: `Lỗi parse JSON: ${msg}` }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'JSON phải là một object { title, durationMinutes, questions[] }' }
  }

  const obj = parsed as Record<string, unknown>
  const questionsRaw = obj.questions
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    return { ok: false, error: 'Thiếu mảng questions[] hoặc mảng rỗng' }
  }

  const draft: TestDraft = {
    title: String(obj.title ?? ''),
    subject: String(obj.subject ?? 'Toán'),
    grade: String(obj.grade ?? '8'),
    durationMinutes:
      typeof obj.durationMinutes === 'number' && obj.durationMinutes > 0
        ? Math.floor(obj.durationMinutes)
        : 15,
    questions: questionsRaw.map((q, i) =>
      normalizeQuestion(q as Record<string, unknown>, i),
    ),
  }

  const validation = publishSystemTestSchema.safeParse(testDraftToPayload(draft))
  if (!validation.success) {
    const issue = validation.error.issues[0]
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return { ok: false, error: `${issue.message}${path}` }
  }

  return { ok: true, data: draft }
}

export function testDraftToPayload(draft: TestDraft): Record<string, unknown> {
  return {
    title: draft.title.trim(),
    subject: draft.subject.trim() || 'Toán',
    grade: draft.grade.trim() || '8',
    durationMinutes: draft.durationMinutes,
    questions: draft.questions.map((q) => {
      const base = {
        type: q.type,
        content: q.content,
        topic: q.topic || undefined,
        explanation: q.explanation || undefined,
        points: q.points,
      }
      switch (q.type) {
        case 'MULTIPLE_CHOICE':
          return {
            ...base,
            options: [...q.options],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          }
        case 'TRUE_FALSE_GROUP':
          return {
            ...base,
            subQuestions: q.subQuestions.map((sq) => ({
              label: sq.label,
              content: sq.content,
              correctAnswer: sq.correctAnswer,
            })),
          }
        case 'SHORT_ANSWER':
          return {
            ...base,
            correctAnswer: String(q.correctAnswer ?? ''),
          }
        case 'ESSAY':
          return base
      }
    }),
  }
}

export function systemTestRowToTestDraft(st: {
  title: string
  subject: string
  grade: string
  durationMinutes: number
  questions: unknown
}): ParseResult {
  return systemTestQuestionsToTierDraft(st)
}

/** Load tier draft from stored SystemTest row (direct — no JSON round-trip). */
export function systemTestQuestionsToTierDraft(
  st: {
    title: string
    subject: string
    grade: string
    durationMinutes: number
    questions: unknown
  },
  groupMeta?: {
    title: string
    subject: string
    grade: string
    durationMinutes: number
  },
): ParseResult {
  const questionsRaw = st.questions
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    return { ok: false, error: 'Không có câu hỏi trong đề' }
  }

  const draft: TestDraft = {
    title: groupMeta?.title ?? st.title,
    subject: groupMeta?.subject ?? st.subject,
    grade: groupMeta?.grade ?? st.grade,
    durationMinutes: groupMeta?.durationMinutes ?? st.durationMinutes,
    questions: questionsRaw.map((q, i) =>
      normalizeQuestion(q as Record<string, unknown>, i),
    ),
  }

  const validation = publishSystemTestSchema.safeParse(testDraftToPayload(draft))
  if (!validation.success) {
    const issue = validation.error.issues[0]
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return { ok: false, error: `${issue.message}${path}` }
  }

  return { ok: true, data: draft }
}

export function validateTestDraft(draft: TestDraft): ParseResult {
  const validation = publishSystemTestSchema.safeParse(testDraftToPayload(draft))
  if (!validation.success) {
    const issue = validation.error.issues[0]
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return { ok: false, error: `${issue.message}${path}` }
  }
  return { ok: true, data: draft }
}

export function questionDraftToParsed(q: QuestionDraft): ParsedQuestion {
  const base: ParsedQuestion = {
    id: q.id,
    type: q.type,
    topic: q.topic || undefined,
    content: q.content,
    explanation: q.explanation || undefined,
    points: q.points,
  }
  if (q.type === 'MULTIPLE_CHOICE') {
    base.options = [...q.options]
    base.correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
  } else if (q.type === 'TRUE_FALSE_GROUP') {
    base.subQuestions = q.subQuestions.map((sq, i) => ({
      id: sq.id ?? `${q.id}-sq-${i}`,
      label: sq.label,
      content: sq.content,
      correctAnswer: sq.correctAnswer,
    }))
  } else if (q.type === 'SHORT_ANSWER') {
    base.correctAnswer = String(q.correctAnswer ?? '')
  }
  return applyTypeDefaults(base, q.type)
}

export function parsedToQuestionDraft(q: ParsedQuestion): QuestionDraft {
  return {
    id: q.id,
    type: q.type,
    topic: q.topic ?? '',
    content: q.content,
    options:
      q.options && q.options.length >= 4
        ? [q.options[0], q.options[1], q.options[2], q.options[3]]
        : ['', '', '', ''],
    subQuestions: (q.subQuestions ?? []).map((sq, i) => ({
      id: sq.id || `${q.id}-sq-${i}`,
      label: sq.label,
      content: sq.content,
      correctAnswer: sq.correctAnswer ?? false,
    })),
    correctAnswer:
      q.correctAnswer ??
      (q.type === 'MULTIPLE_CHOICE' ? 0 : q.type === 'SHORT_ANSWER' ? '' : 0),
    explanation: q.explanation ?? '',
    points: q.points ?? 1,
  }
}
