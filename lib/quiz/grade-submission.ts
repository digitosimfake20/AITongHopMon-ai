import { scoreTrueFalseGroup } from '@/lib/quiz/score-true-false'

export interface GradedQuestion {
  id: string
  type: string
  correctOption: string | null
  points: number
  topic: string | null
  subject: string | null
}

export interface ClientAnswer {
  questionId: string
  questionType?: string
  answer: unknown
  timeSpentSeconds: number
}

export interface GradedAnswer {
  questionId: string
  type: string
  topic: string | null
  subject: string | null
  answer: unknown
  isCorrect: boolean
  pointsEarned: number
  timeSpentSeconds: number
}

function hasStoredKey(correctOption: string | null): correctOption is string {
  return typeof correctOption === 'string' && correctOption.trim().length > 0
}

function scoreAnswer(
  type: string,
  studentAnswer: unknown,
  correctOption: string | null,
  maxPoints: number,
): { isCorrect: boolean; pointsEarned: number } {
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      // A null or blank key must not match an empty client answer (`'' === (null ?? '')`).
      if (!hasStoredKey(correctOption)) {
        return { isCorrect: false, pointsEarned: 0 }
      }
      const given = typeof studentAnswer === 'string' ? studentAnswer : ''
      const correct = given.toUpperCase() === correctOption.toUpperCase()
      return { isCorrect: correct, pointsEarned: correct ? maxPoints : 0 }
    }
    case 'TRUE_FALSE_GROUP': {
      const ans =
        studentAnswer !== null &&
        typeof studentAnswer === 'object' &&
        !Array.isArray(studentAnswer)
          ? (studentAnswer as Record<string, boolean>)
          : {}
      const pts = scoreTrueFalseGroup(ans, correctOption, maxPoints)
      return { isCorrect: pts >= maxPoints, pointsEarned: Math.round(pts * 100) / 100 }
    }
    case 'SHORT_ANSWER': {
      // A null or blank key must not match an empty client answer (`'' === (null ?? '')`).
      if (!hasStoredKey(correctOption)) {
        return { isCorrect: false, pointsEarned: 0 }
      }
      const given = typeof studentAnswer === 'string' ? studentAnswer : ''
      const correct = given.trim().toLowerCase() === correctOption.trim().toLowerCase()
      return { isCorrect: correct, pointsEarned: correct ? maxPoints : 0 }
    }
    case 'ESSAY':
      return { isCorrect: false, pointsEarned: 0 }
    default:
      return { isCorrect: false, pointsEarned: 0 }
  }
}

/** Placeholder that fails the existing comparison when the client sent no row. */
function unansweredValue(type: string): unknown {
  if (type === 'TRUE_FALSE_GROUP') return {}
  return ''
}

/**
 * Score a test from its question rows only.
 * Client ids that are not on the test are ignored. Duplicate client ids keep the first row.
 * Questions the client omitted are wrong.
 */
export function gradeTestAnswers(
  questions: GradedQuestion[],
  answers: ClientAnswer[],
): GradedAnswer[] {
  const firstById = new Map<string, ClientAnswer>()
  for (const answer of answers) {
    if (!firstById.has(answer.questionId)) {
      firstById.set(answer.questionId, answer)
    }
  }

  return questions.map((question) => {
    const submitted = firstById.get(question.id)
    const answer = submitted ? submitted.answer : unansweredValue(question.type)
    const scored = scoreAnswer(question.type, answer, question.correctOption, question.points)
    return {
      questionId: question.id,
      type: question.type,
      topic: question.topic,
      subject: question.subject,
      answer,
      isCorrect: scored.isCorrect,
      pointsEarned: scored.pointsEarned,
      timeSpentSeconds: submitted ? submitted.timeSpentSeconds : 0,
    }
  })
}
