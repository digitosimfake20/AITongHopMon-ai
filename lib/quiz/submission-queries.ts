import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionResultRow {
  questionId: string
  type: string
  topic: string
  content: string
  options: unknown          // raw DB JSON (string[] or subQuestion[])
  correctOption: string | null
  explanation: string | null
  points: number
  studentAnswer: unknown    // raw DB JSON (what the student submitted)
  selectedOption: string    // legacy single-value field
  isCorrect: boolean
  pointsEarned: number
  timeSpentSeconds: number
}

export interface SubmissionResult {
  id: string
  testId: string
  testTitle: string
  timeLimitMinutes: number
  difficultyLevel: string
  score: number             // stored 0-10
  totalQuestions: number
  correctCount: number
  timeSpentSeconds: number
  attemptNumber: number
  status: string
  submittedAt: Date
  aiFeedbackSummary: string | null
  studentId: string
  studentName: string
  questionResults: QuestionResultRow[]
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function getSubmissionResult(
  submissionId: string,
  caller: { id: string; role: string },
): Promise<SubmissionResult | null> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      test: { select: { title: true, timeLimitMinutes: true, difficultyLevel: true } },
      student: { select: { fullName: true } },
      details: {
        include: {
          question: {
            select: {
              id: true,
              type: true,
              topic: true,
              content: true,
              options: true,
              correctOption: true,
              explanation: true,
              points: true,
            },
          },
        },
      },
    },
  })

  if (!submission) return null
  // Students can only view their own results; teachers can view any result
  const isTeacher = caller.role === 'teacher' || caller.role === 'admin'
  if (!isTeacher && submission.studentId !== caller.id) return null

  const questionResults: QuestionResultRow[] = submission.details.map((d) => ({
    questionId: d.questionId,
    type: d.question.type,
    topic: d.question.topic,
    content: d.question.content,
    options: d.question.options,
    correctOption: d.question.correctOption,
    explanation: d.question.explanation,
    points: d.question.points,
    studentAnswer: d.studentAnswer,
    selectedOption: d.selectedOption,
    isCorrect: d.isCorrect,
    pointsEarned: d.pointsEarned,
    timeSpentSeconds: d.timeSpentSeconds,
  }))

  return {
    id: submission.id,
    testId: submission.testId,
    testTitle: submission.test.title,
    timeLimitMinutes: submission.test.timeLimitMinutes,
    difficultyLevel: String(submission.test.difficultyLevel),
    score: Number(submission.score),
    totalQuestions: submission.totalQuestions,
    correctCount: submission.correctCount,
    timeSpentSeconds: submission.timeSpentSeconds,
    attemptNumber: submission.attemptNumber,
    status: String(submission.status),
    submittedAt: submission.submittedAt,
    aiFeedbackSummary: submission.aiFeedbackSummary,
    studentId: submission.studentId,
    studentName: submission.student.fullName,
    questionResults,
  }
}
