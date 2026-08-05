import type { Prisma } from '@prisma/client'
import type { PublishSystemTestInput } from '@/lib/validations/system-test'

export function toDbQuestion(q: PublishSystemTestInput['questions'][number]): {
  options: Prisma.InputJsonValue
  correctOption: string | null
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE_GROUP' | 'SHORT_ANSWER' | 'ESSAY'
} {
  const type = q.type
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      const opts = q.options && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D']
      const idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
      return {
        type,
        options: opts,
        correctOption: String.fromCharCode(65 + Math.max(0, Math.min(3, idx))),
      }
    }
    case 'TRUE_FALSE_GROUP': {
      const subs = (q.subQuestions ?? []).map((sq, i) => ({
        id: sq.id ?? `sq-${i}`,
        label: sq.label,
        content: sq.content,
        correctAnswer: sq.correctAnswer ?? false,
      }))
      return {
        type,
        options: subs,
        correctOption: subs.map((s) => (s.correctAnswer ? 'T' : 'F')).join(','),
      }
    }
    case 'SHORT_ANSWER':
      return {
        type,
        options: [],
        correctOption: typeof q.correctAnswer === 'string' ? q.correctAnswer : String(q.correctAnswer ?? ''),
      }
    case 'ESSAY':
      return { type, options: [], correctOption: null }
  }
}
