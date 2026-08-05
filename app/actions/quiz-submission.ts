'use server'

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { findClassTestByTestId } from '@/lib/adaptive/find-class-test'
import {
  recordAdaptiveRound1Submit,
  recordAdaptiveRound2Submit,
} from '@/app/actions/test-group'
import { runPostSubmissionAIPipeline } from '@/lib/ai/pipeline'
import type { SubmissionDetailForPipeline } from '@/lib/ai/pipeline'
import { normalizeTopicName } from '@/lib/knowledge/topic-normalize'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionAnswerInput =
  | { type: 'MULTIPLE_CHOICE'; answer: string /* "A"|"B"|"C"|"D" */ }
  | { type: 'TRUE_FALSE_GROUP'; answer: Record<string, boolean> /* {a:true, b:false, ...} */ }
  | { type: 'SHORT_ANSWER'; answer: string }
  | { type: 'ESSAY'; answer: string }

export interface SubmitQuizInput {
  testId: string
  totalTimeSpentSeconds: number
  answers: Array<{
    questionId: string
    questionType: QuestionAnswerInput['type']
    answer: QuestionAnswerInput['answer']
    timeSpentSeconds: number
  }>
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function scoreTrueFalse(
  studentAnswers: Record<string, boolean>,
  correctStr: string | null, // "T,F,T,T"
  maxPoints: number,
): number {
  if (!correctStr) return 0
  const correct = correctStr.split(',').map((s) => s.trim() === 'T')
  const labels = Object.keys(studentAnswers)
  const numCorrect = labels.filter((_, i) => studentAnswers[labels[i]] === correct[i]).length
  const total = correct.length

  if (total === 0) return 0
  if (numCorrect === total) return maxPoints
  if (numCorrect === 3) return maxPoints * 0.5
  if (numCorrect === 2) return maxPoints * 0.25
  if (numCorrect === 1) return maxPoints * 0.1
  return 0
}

function scoreAnswer(
  type: QuestionAnswerInput['type'],
  studentAnswer: QuestionAnswerInput['answer'],
  correctOption: string | null,
  maxPoints: number,
): { isCorrect: boolean; pointsEarned: number } {
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      const correct = (studentAnswer as string).toUpperCase() === (correctOption ?? '').toUpperCase()
      return { isCorrect: correct, pointsEarned: correct ? maxPoints : 0 }
    }
    case 'TRUE_FALSE_GROUP': {
      const ans = studentAnswer as Record<string, boolean>
      const pts = scoreTrueFalse(ans, correctOption, maxPoints)
      return { isCorrect: pts >= maxPoints, pointsEarned: Math.round(pts * 100) / 100 }
    }
    case 'SHORT_ANSWER': {
      const correct =
        (studentAnswer as string).trim().toLowerCase() === (correctOption ?? '').trim().toLowerCase()
      return { isCorrect: correct, pointsEarned: correct ? maxPoints : 0 }
    }
    case 'ESSAY':
      return { isCorrect: false, pointsEarned: 0 }
  }
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function submitQuizAction(
  input: SubmitQuizInput,
): Promise<ActionResult<{ submissionId: string }>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') return { success: false, error: 'Chỉ học sinh mới được nộp bài' }

  // Fetch test and all questions
  const test = await prisma.test.findUnique({ where: { id: input.testId } })
  if (!test) return { success: false, error: 'Không tìm thấy đề kiểm tra' }

  const questionIds = test.questionIds as string[]
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, type: true, correctOption: true, points: true, topic: true, subject: true },
  })
  const qMap = new Map(questions.map((q) => [q.id, q]))

  // Determine attempt number
  const prevAttempts = await prisma.submission.count({
    where: { testId: input.testId, studentId: user.id },
  })
  const attemptNumber = prevAttempts + 1

  // Score each answer
  let totalScore = 0
  let correctCount = 0

  const details: Prisma.SubmissionDetailCreateManySubmissionInput[] = input.answers.map((a) => {
    const q = qMap.get(a.questionId)
    const maxPts = q?.points ?? 1
    const { isCorrect, pointsEarned } = scoreAnswer(a.questionType, a.answer, q?.correctOption ?? null, maxPts)
    if (isCorrect) correctCount++
    totalScore += pointsEarned

    const selectedOption =
      typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer)

    return {
      questionId: a.questionId,
      selectedOption,
      studentAnswer:
        typeof a.answer === 'string'
          ? Prisma.JsonNull
          : (a.answer as Prisma.InputJsonValue),
      isCorrect,
      pointsEarned,
      timeSpentSeconds: a.timeSpentSeconds,
    }
  })

  const finalScore = Math.min(10, Math.round(totalScore * 100) / 100)

  const submission = await prisma.submission.create({
    data: {
      testId: input.testId,
      studentId: user.id,
      attemptNumber,
      score: finalScore,
      totalQuestions: questionIds.length,
      correctCount,
      timeSpentSeconds: input.totalTimeSpentSeconds,
      status: 'COMPLETED',
      details: { createMany: { data: details } },
    },
  })

  // ── Fire-and-forget: AI pipeline (BKT + cognitive profile update) ──────────
  const pipelineDetails: SubmissionDetailForPipeline[] = input.answers.map((a) => {
    const q = qMap.get(a.questionId)
    const { isCorrect } = scoreAnswer(a.questionType, a.answer, q?.correctOption ?? null, q?.points ?? 1)
    return {
      questionId: a.questionId,
      topic: normalizeTopicName(q?.topic),
      subject: q?.subject ?? 'Toán',
      type: a.questionType,
      isCorrect,
      timeSpentSeconds: a.timeSpentSeconds,
    }
  })
  void runPostSubmissionAIPipeline(user.id, pipelineDetails)

  // Adaptive group: record round progress
  const classTest = await findClassTestByTestId(input.testId)
  if (classTest?.isAdaptive) {
    if (input.testId === classTest.mediumTestId) {
      await recordAdaptiveRound1Submit(
        classTest.id,
        user.id,
        submission.id,
        finalScore,
        classTest.passScoreThreshold,
        classTest.easyTestId!,
        classTest.hardTestId!,
      )
    } else if (
      input.testId === classTest.easyTestId ||
      input.testId === classTest.hardTestId
    ) {
      await recordAdaptiveRound2Submit(classTest.id, user.id, submission.id)
    }
  }

  return { success: true, data: { submissionId: submission.id } }
}
