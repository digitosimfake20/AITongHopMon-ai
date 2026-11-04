import type { Assignment } from '@/lib/dashboard-types'
import prisma from '@/lib/prisma'
import { cachedQuery } from '@/lib/cache/cached-query'
import { CacheTags, CacheTTL } from '@/lib/cache/tags'
import { computeAdaptiveProgress } from '@/lib/adaptive/adaptive-logic'
import { PRACTICE_TEST_PREFIX } from '@/lib/quiz/practice-quiz'
import { assignmentsFromQuizBank } from '@/lib/dashboard/student-assignments'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'

function resolveAvailability(
  now: Date,
  startTime: Date,
  endTime: Date,
  roundsCompleted: number,
  maxRounds: number,
): QuizBankItem['availability'] {
  if (now < startTime) return 'not_started'
  if (now > endTime) return 'expired'
  if (roundsCompleted >= maxRounds) return 'max_attempts'
  return 'open'
}

/**
 * Slim dashboard assignments: teacher ClassTests + adaptive groups only.
 * Skips the full quiz-bank catalog (practice mixes, questionId arrays, etc.).
 */
async function getDashboardAssignmentsUncached(
  classId: string,
  studentId: string,
): Promise<QuizBankItem[]> {
  const [classTests, adaptiveClassTests, packages] = await prisma.$transaction([
    prisma.classTest.findMany({
      where: { classId, isAdaptive: false, testId: { not: null } },
      select: {
        id: true,
        testId: true,
        startTime: true,
        endTime: true,
        maxAttempts: true,
        allowReview: true,
        systemTest: { select: { subject: true } },
        test: {
          select: {
            id: true,
            title: true,
            timeLimitMinutes: true,
            difficultyLevel: true,
          },
        },
      },
    }),
    prisma.classTest.findMany({
      where: { classId, isAdaptive: true },
      select: {
        id: true,
        easyTestId: true,
        mediumTestId: true,
        hardTestId: true,
        startTime: true,
        endTime: true,
        allowReview: true,
        passScoreThreshold: true,
        testGroup: { select: { title: true, subject: true, topic: true } },
        mediumTest: { select: { id: true, timeLimitMinutes: true } },
        adaptiveSessions: {
          where: { studentId },
          take: 1,
          select: {
            round1SubmissionId: true,
            round2TestId: true,
            round2Difficulty: true,
            round2SubmissionId: true,
          },
        },
      },
    }),
    prisma.quizPackage.findMany({
      where: { classId },
      select: {
        id: true,
        mode: true,
        standardTestId: true,
        easyTestId: true,
        mediumTestId: true,
        hardTestId: true,
      },
    }),
  ])

  const assignedTests = classTests
    .map((ct) => ct.test)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .filter((t) => !t.title.startsWith(PRACTICE_TEST_PREFIX))

  const adaptiveTestIds = new Set<string>()
  for (const ct of adaptiveClassTests) {
    if (ct.easyTestId) adaptiveTestIds.add(ct.easyTestId)
    if (ct.mediumTestId) adaptiveTestIds.add(ct.mediumTestId)
    if (ct.hardTestId) adaptiveTestIds.add(ct.hardTestId)
  }

  const regularTests = assignedTests.filter((t) => !adaptiveTestIds.has(t.id))
  if (regularTests.length === 0 && adaptiveClassTests.length === 0) return []

  const classTestByTestId = new Map(
    classTests.filter((ct) => ct.testId).map((ct) => [ct.testId!, ct]),
  )

  const submissionTestIds = [
    ...new Set([...regularTests.map((t) => t.id), ...adaptiveTestIds]),
  ]

  const allSubmissions =
    submissionTestIds.length > 0
      ? await prisma.submission.findMany({
          where: { studentId, testId: { in: submissionTestIds } },
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            testId: true,
            score: true,
            attemptNumber: true,
            submittedAt: true,
          },
        })
      : []

  const regularIdSet = new Set(regularTests.map((t) => t.id))
  const latestSub = new Map<(typeof allSubmissions)[number]['testId'], (typeof allSubmissions)[number]>()
  const attemptCounts = new Map<string, number>()
  const adaptiveScoreBySubId = new Map<string, number>()
  const scoreByTestId = new Map<string, number>()

  for (const s of allSubmissions) {
    if (regularIdSet.has(s.testId)) {
      attemptCounts.set(s.testId, (attemptCounts.get(s.testId) ?? 0) + 1)
      if (!latestSub.has(s.testId)) latestSub.set(s.testId, s)
    }
    if (adaptiveTestIds.has(s.testId)) {
      adaptiveScoreBySubId.set(s.id, Number(s.score))
      if (!scoreByTestId.has(s.testId)) {
        scoreByTestId.set(s.testId, Number(s.score))
      }
    }
  }

  const testToPackage = new Map<string, { id: string; mode: 'STANDARD' | 'ADAPTIVE_PACKAGE' }>()
  for (const pkg of packages) {
    const mode = pkg.mode as 'STANDARD' | 'ADAPTIVE_PACKAGE'
    for (const tid of [pkg.standardTestId, pkg.easyTestId, pkg.mediumTestId, pkg.hardTestId]) {
      if (tid) testToPackage.set(tid, { id: pkg.id, mode })
    }
  }

  const now = new Date()

  const regularItems: QuizBankItem[] = regularTests.map((test) => {
    const ct = classTestByTestId.get(test.id) ?? null
    const subject = ct?.systemTest?.subject ?? 'Toán'
    const pkg = testToPackage.get(test.id) ?? null
    const sub = latestSub.get(test.id) ?? null
    const attemptCount = attemptCounts.get(test.id) ?? 0

    let availability: QuizBankItem['availability'] = 'open'
    if (ct) {
      if (now < ct.startTime) availability = 'not_started'
      else if (now > ct.endTime) availability = 'expired'
      else if (ct.maxAttempts !== -1 && attemptCount >= ct.maxAttempts) {
        availability = 'max_attempts'
      }
    }

    return {
      testId: test.id,
      packageId: pkg?.id ?? null,
      classTestId: ct?.id ?? null,
      title: test.title,
      subject,
      topic: '',
      timeLimitMinutes: test.timeLimitMinutes,
      questionCount: 0,
      totalPoints: 0,
      difficultyLevel: String(test.difficultyLevel),
      packageMode: pkg?.mode ?? null,
      startTime: ct?.startTime ?? null,
      endTime: ct?.endTime ?? null,
      maxAttempts: ct?.maxAttempts ?? null,
      allowReview: ct?.allowReview ?? true,
      attemptCount,
      availability,
      latestSubmission: sub
        ? {
            id: sub.id,
            score: Number(sub.score),
            attemptNumber: sub.attemptNumber,
            submittedAt: sub.submittedAt,
          }
        : null,
    }
  })

  const adaptiveItems: QuizBankItem[] = adaptiveClassTests.map((ct) => {
    const session = ct.adaptiveSessions[0] ?? null
    const medium = ct.mediumTest!

    const round1Score: number | null = session?.round1SubmissionId
      ? (adaptiveScoreBySubId.get(session.round1SubmissionId) ??
        (ct.mediumTestId ? scoreByTestId.get(ct.mediumTestId) : undefined) ??
        null)
      : null
    const round2Score: number | null = session?.round2SubmissionId
      ? (adaptiveScoreBySubId.get(session.round2SubmissionId) ??
        (session.round2TestId ? scoreByTestId.get(session.round2TestId) : undefined) ??
        null)
      : null

    const progress = computeAdaptiveProgress(
      {
        mediumTestId: ct.mediumTestId!,
        easyTestId: ct.easyTestId!,
        hardTestId: ct.hardTestId!,
        passScoreThreshold: ct.passScoreThreshold,
      },
      session,
      round1Score,
      round2Score,
    )

    const roundsCompleted =
      progress.status === 'completed' ? 2 : progress.status === 'not_started' ? 0 : 1
    const availability = resolveAvailability(
      now,
      ct.startTime,
      ct.endTime,
      roundsCompleted,
      2,
    )

    return {
      testId: progress.nextTestId ?? ct.mediumTestId!,
      packageId: null,
      classTestId: ct.id,
      title: ct.testGroup?.title ?? 'Cụm đề phân hóa',
      subject: ct.testGroup?.subject ?? 'Toán',
      topic: ct.testGroup?.topic ?? '',
      timeLimitMinutes: medium.timeLimitMinutes,
      questionCount: 0,
      totalPoints: 10,
      difficultyLevel: 'MEDIUM',
      packageMode: null,
      startTime: ct.startTime,
      endTime: ct.endTime,
      maxAttempts: 2,
      allowReview: ct.allowReview,
      attemptCount: roundsCompleted,
      availability,
      latestSubmission:
        round2Score != null && session?.round2SubmissionId
          ? {
              id: session.round2SubmissionId,
              score: round2Score,
              attemptNumber: 2,
              submittedAt: new Date(0),
            }
          : round1Score != null && session?.round1SubmissionId
            ? {
                id: session.round1SubmissionId,
                score: round1Score,
                attemptNumber: 1,
                submittedAt: new Date(0),
              }
            : null,
      isAdaptiveGroup: true,
      adaptiveProgress: progress,
      passScoreThreshold: ct.passScoreThreshold,
    }
  })

  return [...adaptiveItems, ...regularItems]
}

function reviveAssignmentDates(item: QuizBankItem): QuizBankItem {
  const startTime = item.startTime ? new Date(item.startTime as unknown as string) : null
  const endTime = item.endTime ? new Date(item.endTime as unknown as string) : null
  const latest = item.latestSubmission
    ? {
        ...item.latestSubmission,
        submittedAt: new Date(item.latestSubmission.submittedAt as unknown as string),
      }
    : null

  const now = new Date()
  let availability = item.availability

  if (startTime && endTime) {
    if (item.isAdaptiveGroup) {
      availability = resolveAvailability(now, startTime, endTime, item.attemptCount, 2)
    } else if (now < startTime) {
      availability = 'not_started'
    } else if (now > endTime) {
      availability = 'expired'
    } else if (
      item.maxAttempts != null &&
      item.maxAttempts !== -1 &&
      item.attemptCount >= item.maxAttempts
    ) {
      availability = 'max_attempts'
    } else {
      availability = 'open'
    }
  }

  return {
    ...item,
    startTime,
    endTime,
    latestSubmission: latest,
    availability,
  }
}

/** Cached lean assignments for the student dashboard card (not full quiz bank). */
export async function getDashboardAssignments(
  classId: string,
  studentId: string,
): Promise<Assignment[]> {
  const cached = cachedQuery(getDashboardAssignmentsUncached, {
    keyParts: ['student-dash-assignments'],
    tags: [
      CacheTags.studentDash(studentId),
      CacheTags.quizBank(classId),
      CacheTags.quizBankStudent(classId, studentId),
      CacheTags.adaptive(classId),
    ],
    revalidate: CacheTTL.studentDash,
  })
  const items = (await cached(classId, studentId)).map(reviveAssignmentDates)
  return assignmentsFromQuizBank(items)
}
