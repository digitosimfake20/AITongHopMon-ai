import prisma from '@/lib/prisma'
import {
  computeAdaptiveProgress,
  type AdaptiveProgress,
} from '@/lib/adaptive/adaptive-logic'

// ---------------------------------------------------------------------------
// Quiz Bank (student view)
// ---------------------------------------------------------------------------

export interface QuizBankItem {
  testId: string
  packageId: string | null
  classTestId: string | null
  title: string
  subject: string
  topic: string
  timeLimitMinutes: number
  questionCount: number
  totalPoints: number
  difficultyLevel: string
  packageMode: 'STANDARD' | 'ADAPTIVE_PACKAGE' | null
  /** Scheduling from ClassTest (null = teacher-created, always open) */
  startTime: Date | null
  endTime: Date | null
  maxAttempts: number | null
  allowReview: boolean
  attemptCount: number
  availability: 'open' | 'not_started' | 'expired' | 'max_attempts'
  latestSubmission: {
    id: string
    score: number
    attemptNumber: number
    submittedAt: Date
  } | null
  /** Cụm đề phân hóa 2 lượt */
  isAdaptiveGroup?: boolean
  adaptiveProgress?: AdaptiveProgress
  passScoreThreshold?: number
}

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

async function getQuizBankForStudentUncached(
  classId: string,
  studentId: string,
): Promise<QuizBankItem[]> {
  const [tests, classTests, adaptiveClassTests] = await prisma.$transaction([
    prisma.test.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classTest.findMany({
      where: { classId, isAdaptive: false },
      select: {
        id: true,
        testId: true,
        startTime: true,
        endTime: true,
        maxAttempts: true,
        allowReview: true,
        systemTest: { select: { subject: true } },
      },
    }),
    prisma.classTest.findMany({
      where: { classId, isAdaptive: true },
      include: {
        testGroup: { select: { title: true, subject: true, topic: true } },
        mediumTest: { select: { id: true, timeLimitMinutes: true, questionIds: true } },
        adaptiveSessions: {
          where: { studentId },
          take: 1,
        },
      },
    }),
  ])

  const adaptiveTestIds = new Set<string>()
  for (const ct of adaptiveClassTests) {
    if (ct.easyTestId) adaptiveTestIds.add(ct.easyTestId)
    if (ct.mediumTestId) adaptiveTestIds.add(ct.mediumTestId)
    if (ct.hardTestId) adaptiveTestIds.add(ct.hardTestId)
  }

  const regularTests = tests.filter((t) => !adaptiveTestIds.has(t.id))
  if (regularTests.length === 0 && adaptiveClassTests.length === 0) return []

  const classTestByTestId = new Map(
    classTests.filter((ct) => ct.testId).map((ct) => [ct.testId!, ct]),
  )

  const [submissions, packages] = await prisma.$transaction([
    prisma.submission.findMany({
      where: { testId: { in: regularTests.map((t) => t.id) }, studentId },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, testId: true, score: true, attemptNumber: true, submittedAt: true },
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

  const adaptiveSubmissions =
    adaptiveTestIds.size > 0
      ? await prisma.submission.findMany({
          where: {
            studentId,
            testId: { in: Array.from(adaptiveTestIds) },
          },
          select: { id: true, testId: true, score: true },
        })
      : []

  const latestSub = new Map<string, (typeof submissions)[number]>()
  const attemptCounts = new Map<string, number>()
  for (const s of submissions) {
    attemptCounts.set(s.testId, (attemptCounts.get(s.testId) ?? 0) + 1)
    if (!latestSub.has(s.testId)) latestSub.set(s.testId, s)
  }

  const adaptiveScoreBySubId = new Map(adaptiveSubmissions.map((s) => [s.id, Number(s.score)]))
  const scoreByTestId = new Map(adaptiveSubmissions.map((s) => [s.testId, Number(s.score)]))

  const testToPackage = new Map<string, { id: string; mode: 'STANDARD' | 'ADAPTIVE_PACKAGE' }>()
  for (const pkg of packages) {
    const mode = pkg.mode as 'STANDARD' | 'ADAPTIVE_PACKAGE'
    for (const tid of [pkg.standardTestId, pkg.easyTestId, pkg.mediumTestId, pkg.hardTestId]) {
      if (tid) testToPackage.set(tid, { id: pkg.id, mode })
    }
  }

  const now = new Date()

  const regularItems: QuizBankItem[] = regularTests.map((test) => {
    const qIds = test.questionIds as string[]
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
      questionCount: qIds.length,
      totalPoints: qIds.length,
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
    const qIds = medium.questionIds as string[]

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

    const roundsCompleted = progress.status === 'completed' ? 2 : progress.status === 'not_started' ? 0 : 1
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
      questionCount: qIds.length,
      totalPoints: 10,
      difficultyLevel: 'MEDIUM',
      packageMode: null,
      startTime: ct.startTime,
      endTime: ct.endTime,
      maxAttempts: 2,
      allowReview: ct.allowReview,
      attemptCount: roundsCompleted,
      availability,
      latestSubmission: round2Score != null && session?.round2SubmissionId
        ? {
            id: session.round2SubmissionId,
            score: round2Score,
            attemptNumber: 2,
            submittedAt: new Date(),
          }
        : round1Score != null && session?.round1SubmissionId
          ? {
              id: session.round1SubmissionId,
              score: round1Score,
              attemptNumber: 1,
              submittedAt: new Date(),
            }
          : null,
      isAdaptiveGroup: true,
      adaptiveProgress: progress,
      passScoreThreshold: ct.passScoreThreshold,
    }
  })

  return [...adaptiveItems, ...regularItems]
}

function reviveQuizBankItem(item: QuizBankItem): QuizBankItem {
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

/** Cached per student (~45s). Availability recomputed on read so deadlines stay honest. */
export async function getQuizBankForStudent(
  classId: string,
  studentId: string,
): Promise<QuizBankItem[]> {
  const { cachedQuery } = await import('@/lib/cache/cached-query')
  const { CacheTags, CacheTTL } = await import('@/lib/cache/tags')

  const cached = cachedQuery(getQuizBankForStudentUncached, {
    keyParts: ['quiz-bank'],
    tags: [
      CacheTags.quizBank(classId),
      CacheTags.quizBankStudent(classId, studentId),
      CacheTags.adaptive(classId),
    ],
    revalidate: CacheTTL.quizBank,
  })
  const items = await cached(classId, studentId)
  return items.map(reviveQuizBankItem)
}

// ---------------------------------------------------------------------------
// Quiz Taking (questions without correct answers)
// ---------------------------------------------------------------------------

export interface QuizSubStatement {
  label: string
  content: string
}

export interface QuizTakingQuestion {
  id: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE_GROUP' | 'SHORT_ANSWER' | 'ESSAY'
  content: string
  options: string[] | null
  subStatements: QuizSubStatement[] | null
  points: number
}

export interface QuizTakingData {
  testId: string
  title: string
  timeLimitMinutes: number
  previousAttempts: number
  questions: QuizTakingQuestion[]
  topic?: string
  isPersonalPractice?: boolean
  adaptiveContext?: {
    classTestId: string
    round: 1 | 2
    roundLabel: string
  }
}

function parseQuizOptions(type: string, options: unknown): {
  mcOptions: string[] | null
  subStatements: QuizSubStatement[] | null
} {
  if (type === 'MULTIPLE_CHOICE') {
    const arr = Array.isArray(options) ? (options as unknown[]) : []
    return { mcOptions: arr.map(String), subStatements: null }
  }
  if (type === 'TRUE_FALSE_GROUP') {
    const arr = Array.isArray(options) ? (options as unknown[]) : []
    const stmts: QuizSubStatement[] = arr.map((o) => {
      const obj = o as Record<string, unknown>
      return { label: String(obj.label ?? ''), content: String(obj.content ?? '') }
    })
    return { mcOptions: null, subStatements: stmts }
  }
  return { mcOptions: null, subStatements: null }
}

export async function getQuizForTaking(
  testId: string,
  studentId: string,
): Promise<QuizTakingData | null> {
  const test = await prisma.test.findUnique({ where: { id: testId } })
  if (!test) return null

  const membership = await prisma.classMember.findFirst({
    where: { classId: test.classId, studentId },
  })
  if (!membership) return null

  const classTest = await prisma.classTest.findFirst({
    where: {
      OR: [
        { testId },
        { easyTestId: testId },
        { mediumTestId: testId },
        { hardTestId: testId },
      ],
    },
    include: {
      adaptiveSessions: { where: { studentId }, take: 1 },
      testGroup: { select: { title: true } },
    },
  })

  let adaptiveContext: QuizTakingData['adaptiveContext'] | undefined

  if (classTest) {
    const now = new Date()
    if (now < classTest.startTime || now > classTest.endTime) return null

    if (classTest.isAdaptive) {
      const session = classTest.adaptiveSessions[0] ?? null
      const isMedium = testId === classTest.mediumTestId
      const isRound2 =
        testId === classTest.easyTestId || testId === classTest.hardTestId

      if (isMedium) {
        if (session?.round1SubmissionId) return null
        adaptiveContext = {
          classTestId: classTest.id,
          round: 1,
          roundLabel: 'Lượt 1 — Trung bình',
        }
      } else if (isRound2) {
        if (!session?.round1SubmissionId) return null
        if (session.round2TestId !== testId) return null
        if (session.round2SubmissionId) return null
        adaptiveContext = {
          classTestId: classTest.id,
          round: 2,
          roundLabel:
            testId === classTest.hardTestId ? 'Lượt 2 — Khó' : 'Lượt 2 — Dễ',
        }
      } else {
        return null
      }
    } else if (classTest.testId === testId) {
      const attemptCount = await prisma.submission.count({ where: { testId, studentId } })
      if (classTest.maxAttempts !== -1 && attemptCount >= classTest.maxAttempts) return null
    } else {
      return null
    }
  }

  const qIds = test.questionIds as string[]
  const [questions, prevSubmissions] = await prisma.$transaction([
    prisma.question.findMany({
      where: { id: { in: qIds } },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        points: true,
        topic: true,
      },
    }),
    prisma.submission.count({ where: { testId, studentId } }),
  ])

  const qMap = new Map(questions.map((q) => [q.id, q]))
  const orderedQuestions: QuizTakingQuestion[] = qIds
    .map((id) => qMap.get(id))
    .filter(Boolean)
    .map((q) => {
      const { mcOptions, subStatements } = parseQuizOptions(String(q!.type), q!.options)
      return {
        id: q!.id,
        type: q!.type as QuizTakingQuestion['type'],
        content: q!.content,
        options: mcOptions,
        subStatements,
        points: q!.points ?? 1,
      }
    })

  const firstTopic = orderedQuestions.length
    ? questions.find((q) => q.id === orderedQuestions[0].id)?.topic
    : undefined
  const topicFromTitle = test.title.includes('—')
    ? test.title.split('—').pop()?.trim()
    : undefined

  return {
    testId: test.id,
    title: classTest?.isAdaptive
      ? `${classTest.testGroup?.title ?? test.title} (${adaptiveContext?.roundLabel ?? ''})`
      : test.title,
    timeLimitMinutes: test.timeLimitMinutes,
    previousAttempts: prevSubmissions,
    questions: orderedQuestions,
    topic: firstTopic ?? topicFromTitle ?? classTest?.testGroup?.title,
    isPersonalPractice: test.title.startsWith('Luyện tập cá nhân hóa'),
    adaptiveContext,
  }
}
