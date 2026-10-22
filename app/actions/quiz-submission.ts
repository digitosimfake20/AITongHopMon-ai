'use server'

import { after } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { findClassTestByTestId } from '@/lib/adaptive/find-class-test'
import { medianResponseMsFromTimeSpentSeconds } from '@/lib/adaptive/adaptive-round2-decision'
import {
  recordAdaptiveRound1Submit,
  recordAdaptiveRound2Submit,
} from '@/app/actions/test-group'
import { runPostSubmissionAIPipeline } from '@/lib/ai/pipeline'
import type { SubmissionDetailForPipeline } from '@/lib/ai/pipeline'
import { submissionOfficialStatsFromDetails } from '@/lib/knowledge/scored-submission-stats'
import { normalizeTopicName } from '@/lib/knowledge/topic-normalize'
import { isPracticeTestTitle } from '@/lib/quiz/practice-quiz'
import { invalidateAfterSubmit } from '@/lib/cache/invalidate'
import { scoreTrueFalseGroup } from '@/lib/quiz/score-true-false'

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
      const pts = scoreTrueFalseGroup(ans, correctOption, maxPoints)
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

  const [test, prevAttempts] = await Promise.all([
    prisma.test.findUnique({ where: { id: input.testId } }),
    prisma.submission.count({
      where: { testId: input.testId, studentId: user.id },
    }),
  ])

  if (!test) return { success: false, error: 'Không tìm thấy đề kiểm tra' }

  const questionIds = test.questionIds as string[]
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, type: true, correctOption: true, points: true, topic: true, subject: true },
  })
  const qMap = new Map(questions.map((q) => [q.id, q]))

  const attemptNumber = prevAttempts + 1
  const isPractice = isPracticeTestTitle(test.title)

  let totalScore = 0
  let correctCount = 0

  const scoredAnswers = input.answers.map((a) => {
    const q = qMap.get(a.questionId)
    const maxPts = q?.points ?? 1
    const scored = scoreAnswer(a.questionType, a.answer, q?.correctOption ?? null, maxPts)
    if (scored.isCorrect) correctCount++
    totalScore += scored.pointsEarned
    return { answer: a, q, scored }
  })

  const finalScore = Math.min(10, Math.round(totalScore * 100) / 100)

  const details: Prisma.SubmissionDetailCreateManySubmissionInput[] = scoredAnswers.map(
    ({ answer: a, scored }) => ({
      questionId: a.questionId,
      selectedOption:
        typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer),
      studentAnswer:
        typeof a.answer === 'string'
          ? Prisma.JsonNull
          : (a.answer as Prisma.InputJsonValue),
      isCorrect: scored.isCorrect,
      pointsEarned: scored.pointsEarned,
      timeSpentSeconds: a.timeSpentSeconds,
    }),
  )

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

  const pipelineDetails: SubmissionDetailForPipeline[] = scoredAnswers.map(
    ({ answer: a, q, scored }) => ({
      questionId: a.questionId,
      topic: normalizeTopicName(q?.topic),
      subject: q?.subject ?? 'Toán',
      type: a.questionType,
      isCorrect: scored.isCorrect,
      timeSpentSeconds: a.timeSpentSeconds,
    }),
  )

  const submissionId = submission.id
  const testId = input.testId
  const classId = test.classId

  // Bust dashboards / quiz bank immediately so next navigation is fresh
  invalidateAfterSubmit(classId, user.id)

  after(async () => {
    try {
      await runPostSubmissionAIPipeline(user.id, pipelineDetails, {
        skipAiCanonicalization: isPractice,
        skipLlmEnrich: isPractice,
        submissionId,
        officialStats: submissionOfficialStatsFromDetails(
          pipelineDetails.map((d) => ({
            type: d.type,
            isCorrect: d.isCorrect,
          })),
          correctCount,
          questionIds.length,
        ),
      })

      if (isPractice) return

      const classTest = await findClassTestByTestId(testId)
      if (!classTest?.isAdaptive) return

      if (testId === classTest.mediumTestId) {
        const medianResponseMs = medianResponseMsFromTimeSpentSeconds(
          input.answers.map((a) => a.timeSpentSeconds),
        )
        await recordAdaptiveRound1Submit(
          classTest.id,
          user.id,
          submissionId,
          finalScore,
          classTest.passScoreThreshold,
          classTest.easyTestId!,
          classTest.hardTestId!,
          { medianResponseMs },
        )
      } else if (
        testId === classTest.easyTestId ||
        testId === classTest.hardTestId
      ) {
        await recordAdaptiveRound2Submit(classTest.id, user.id, submissionId)
      }
      // Adaptive session changed → bust again for teacher adaptive views
      invalidateAfterSubmit(classId, user.id)
    } catch (err) {
      console.error('[submitQuizAction] post-submit work failed:', err)
    }
  })

  return { success: true, data: { submissionId } }
}
