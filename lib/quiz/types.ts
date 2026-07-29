export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE_GROUP' | 'SHORT_ANSWER' | 'ESSAY'

export type QuizMode = 'STANDARD' | 'ADAPTIVE_PACKAGE'
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD'

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD']

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

export interface TrueFalseSubQuestion {
  id: string
  label: string
  content: string
  /** `undefined`   chua xac nhan duoc like AI cannot know the actual answer smt like that*/
  correctAnswer?: boolean
}

/**
 * Flat, editable shape used throughout the quiz editor UI. Only the fields
 * relevant to `type` are populated/used at any given time; the rest stay
 * `undefined`. Strict per-type validation happens server-side via the
 * discriminated-union zod schema in `lib/validations/quiz.ts`.
 */
export interface ParsedQuestion {
  id: string
  type: QuestionType
  /** Granular 2-4 word sub-topic (e.g. "Phép nhân phân thức") set by AI during import */
  topic?: string
  content: string
  options?: string[]
  subQuestions?: TrueFalseSubQuestion[]
  correctAnswer?: string | number
  explanation?: string
  points?: number
}

export type ExtractedSubQuestion = Omit<TrueFalseSubQuestion, 'id'>
export type ExtractedQuestion = Omit<ParsedQuestion, 'id' | 'subQuestions'> & {
  subQuestions?: ExtractedSubQuestion[]
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm (4 đáp án)',
  TRUE_FALSE_GROUP: 'Đúng / Sai nhiều ý',
  SHORT_ANSWER: 'Trả lời ngắn',
  ESSAY: 'Tự luận',
}

export function createEmptyQuestion(type: QuestionType = 'MULTIPLE_CHOICE'): ParsedQuestion {
  const base: ParsedQuestion = { id: crypto.randomUUID(), type, content: '', points: 1 }
  return applyTypeDefaults(base, type)
}

/** Ensures the type-specific fields exist with sane defaults when switching `type`. */
export function applyTypeDefaults(question: ParsedQuestion, nextType: QuestionType): ParsedQuestion {
  const next: ParsedQuestion = { ...question, type: nextType }

  if (nextType === 'MULTIPLE_CHOICE') {
    next.options = question.options && question.options.length === 4 ? question.options : ['', '', '', '']
    next.correctAnswer = typeof question.correctAnswer === 'number' ? question.correctAnswer : 0
    next.subQuestions = undefined
  } else if (nextType === 'TRUE_FALSE_GROUP') {
    next.subQuestions =
      question.subQuestions && question.subQuestions.length > 0
        ? question.subQuestions
        : [createSubQuestion('a'), createSubQuestion('b'), createSubQuestion('c'), createSubQuestion('d')]
    next.options = undefined
    next.correctAnswer = undefined
  } else if (nextType === 'SHORT_ANSWER') {
    next.correctAnswer = typeof question.correctAnswer === 'string' ? question.correctAnswer : ''
    next.options = undefined
    next.subQuestions = undefined
  } else {
    next.options = undefined
    next.subQuestions = undefined
    next.correctAnswer = undefined
  }

  return next
}

export function createSubQuestion(label: string): TrueFalseSubQuestion {
  return { id: crypto.randomUUID(), label, content: '', correctAnswer: true }
}
