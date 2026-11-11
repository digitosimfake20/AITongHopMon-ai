'use server'

import { after } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { findClassTestByTestId } from '@/lib/adaptive/find-class-test'
import {
  recordAdaptiveRound1Submit,
  recordAdaptiveRound2Submit,
} from '@/lib/adaptive/record-adaptive-rounds'
import { runPostSubmissionAIPipeline } from '@/lib/ai/pipeline'
import type { SubmissionDetailForPipeline } from '@/lib/ai/pipeline'
import { submissionOfficialStatsFromDetails } from '@/lib/knowledge/scored-submission-stats'
import { normalizeTopicName } from '@/lib/knowledge/topic-normalize'
import { isPracticeTestTitle } from '@/lib/quiz/practice-quiz'
import { invalidateAfterSubmit } from '@/lib/cache/invalidate'
import { gradeTestAnswers, type GradedQuestion } from '@/lib/quiz/grade-submission'
import { maxPointsFromQuestions, scoreOutOfTen } from '@/lib/quiz/score-out-of-ten'
import { resolveElapsedSeconds } from '@/lib/quiz/quiz-elapsed'
import { assessQuestionTiming } from '@/lib/quiz/question-timing'
import {
  authorizeQuizTake,
  quizTakeDeniedMessage,
} from '@/lib/quiz/quiz-take-authz'

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
  /** Client wall-clock start. Server recomputes elapsed and caps it at the time limit. */
  clientStartedAtMs?: number | null
  answers: Array<{
    questionId: string
    questionType: QuestionAnswerInput['type']
    answer: QuestionAnswerInput['answer']
    timeSpentSeconds: number
  }>
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

  const test = await prisma.test.findUnique({ where: { id: input.testId } })
  if (!test) return { success: false, error: 'Không tìm thấy đề kiểm tra' }

  const [inProgress, completedAttempts, membership, classTest] = await Promise.all([
    prisma.submission.findFirst({
      where: {
        testId: input.testId,
        studentId: user.id,
        status: 'IN_PROGRESS',
      },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true, attemptNumber: true },
    }),
    prisma.submission.count({
      where: {
        testId: input.testId,
        studentId: user.id,
        status: { not: 'IN_PROGRESS' },
      },
    }),
    prisma.classMember.findFirst({
      where: { classId: test.classId, studentId: user.id },
      select: { id: true },
    }),
    prisma.classTest.findFirst({
      where: {
        OR: [
          { testId: input.testId },
          { easyTestId: input.testId },
          { mediumTestId: input.testId },
          { hardTestId: input.testId },
        ],
      },
      include: {
        adaptiveSessions: { where: { studentId: user.id }, take: 1 },
      },
    }),
  ])

  const gate = authorizeQuizTake({
    hasMembership: Boolean(membership),
    testId: input.testId,
    previousCompletedAttempts: completedAttempts,
    classTest: classTest
      ? {
          id: classTest.id,
          startTime: classTest.startTime,
          endTime: classTest.endTime,
          isAdaptive: classTest.isAdaptive,
          testId: classTest.testId,
          easyTestId: classTest.easyTestId,
          mediumTestId: classTest.mediumTestId,
          hardTestId: classTest.hardTestId,
          maxAttempts: classTest.maxAttempts,
          session: classTest.adaptiveSessions[0] ?? null,
        }
      : null,
  })
  if (!gate.ok) {
    return { success: false, error: quizTakeDeniedMessage(gate.reason) }
  }

  const questionIds = test.questionIds as string[]
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, type: true, correctOption: true, points: true, topic: true, subject: true },
  })
  const qMap = new Map(questions.map((q) => [q.id, q]))
  const gradedQuestions: GradedQuestion[] = []
  for (const id of questionIds) {
    const q = qMap.get(id)
    if (!q) continue
    gradedQuestions.push({
      id: q.id,
      type: q.type,
      correctOption: q.correctOption,
      points: q.points,
      topic: q.topic,
      subject: q.subject,
    })
  }
  const graded = gradeTestAnswers(gradedQuestions, input.answers)

  // Monitored takes create an IN_PROGRESS stub first — complete that row so
  // consent/flags stay attached to the graded submission teachers review.
  const attemptNumber = inProgress?.attemptNumber ?? completedAttempts + 1
  const isPractice = isPracticeTestTitle(test.title)

  let totalScore = 0
  let correctCount = 0
  for (const row of graded) {
    if (row.isCorrect) correctCount++
    totalScore += row.pointsEarned
  }

  const timeLimitSeconds = test.timeLimitMinutes * 60
  const elapsed = resolveElapsedSeconds({
    startedAtMs: input.clientStartedAtMs ?? null,
    nowMs: Date.now(),
    timeLimitSeconds,
    reportedSeconds: input.totalTimeSpentSeconds,
  })
  // Normalize to /10 so practice mixes (N×1pt) and teacher packages (sum≈10) share one scale.
  const maxPoints = maxPointsFromQuestions(questionIds.map((id) => qMap.get(id)))
  const finalScore = scoreOutOfTen(totalScore, maxPoints)

  const perQuestionSeconds = graded.map((row) => row.timeSpentSeconds)
  const timingPreview = assessQuestionTiming({
    perQuestionSeconds,
    totalSeconds: elapsed.seconds,
    questionCount: questionIds.length,
  })
  const questionSeconds = (seconds: number) =>
    timingPreview.quality === 'estimated' ? 0 : seconds

  const details: Prisma.SubmissionDetailCreateManySubmissionInput[] = graded.map((row) => ({
    questionId: row.questionId,
    selectedOption:
      typeof row.answer === 'string' ? row.answer : JSON.stringify(row.answer),
    studentAnswer:
      typeof row.answer === 'string'
        ? Prisma.JsonNull
        : (row.answer as Prisma.InputJsonValue),
    isCorrect: row.isCorrect,
    pointsEarned: row.pointsEarned,
    timeSpentSeconds: questionSeconds(row.timeSpentSeconds),
  }))

  const gradedFields = {
    score: finalScore,
    totalQuestions: questionIds.length,
    correctCount,
    timeSpentSeconds: elapsed.seconds,
    status: 'COMPLETED' as const,
    submittedAt: new Date(),
  }

  const submission = inProgress
    ? await prisma.submission.update({
        where: { id: inProgress.id },
        data: {
          ...gradedFields,
          details: { createMany: { data: details } },
        },
      })
    : await prisma.submission.create({
        data: {
          testId: input.testId,
          studentId: user.id,
          attemptNumber,
          ...gradedFields,
          details: { createMany: { data: details } },
        },
      })

  const pipelineDetails: SubmissionDetailForPipeline[] = graded.map((row) => ({
    questionId: row.questionId,
    topic: normalizeTopicName(row.topic),
    subject: row.subject ?? 'Toán',
    type: row.type,
    isCorrect: row.isCorrect,
    timeSpentSeconds: questionSeconds(row.timeSpentSeconds),
  }))

  const submissionId = submission.id
  const testId = input.testId
  const classId = test.classId

  // Bust dashboards / quiz bank / classGap (via submissions tag) immediately
  // so next navigation is fresh — Phase D/E cache-tag contract.
  invalidateAfterSubmit(classId, user.id)

  after(async () => {
    const afterT0 = Date.now()
    try {
      await runPostSubmissionAIPipeline(user.id, pipelineDetails, {
        skipAiCanonicalization: isPractice,
        skipLlmEnrich: isPractice,
        submissionId,
        timingQuality: timingPreview.quality,
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
        const timing = assessQuestionTiming({
          perQuestionSeconds,
          totalSeconds: elapsed.seconds,
          questionCount: questionIds.length,
        })
        await recordAdaptiveRound1Submit(
          classTest.id,
          user.id,
          submissionId,
          finalScore,
          classTest.passScoreThreshold,
          classTest.easyTestId!,
          classTest.hardTestId!,
          { medianResponseMs: timing.medianMs, reliable: timing.reliable },
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
    } finally {
      console.info(
        `[submitQuizAction] after() done submission=${submissionId} practice=${isPractice ? 1 : 0} ms=${Date.now() - afterT0}`,
      )
    }
  })

  return { success: true, data: { submissionId } }
}
