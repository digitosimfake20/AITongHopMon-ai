import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Quiz Bank (student view)
// ---------------------------------------------------------------------------

export interface QuizBankItem {
  testId: string
  packageId: string | null
  title: string
  subject: string
  topic: string
  timeLimitMinutes: number
  questionCount: number
  totalPoints: number
  difficultyLevel: string
  packageMode: 'STANDARD' | 'ADAPTIVE_PACKAGE' | null
  latestSubmission: {
    id: string
    score: number
    attemptNumber: number
    submittedAt: Date
  } | null
}

export async function getQuizBankForStudent(
  classId: string,
  studentId: string,
): Promise<QuizBankItem[]> {
  // 1. Fetch all tests in the class
  const tests = await prisma.test.findMany({
    where: { classId },
    orderBy: { createdAt: 'desc' },
  })

  if (tests.length === 0) return []

  // 2. Gather all unique questionIds across every test
  const allQuestionIds = Array.from(
    new Set(tests.flatMap((t) => t.questionIds as string[])),
  )

  // 3. Fetch questions + submissions in parallel
  const [questions, submissions, packages] = await prisma.$transaction([
    prisma.question.findMany({
      where: { id: { in: allQuestionIds } },
      select: { id: true, subject: true, points: true },
    }),
    prisma.submission.findMany({
      where: { testId: { in: tests.map((t) => t.id) }, studentId },
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

  // 4. Build quick-lookup maps
  const qMap = new Map(questions.map((q) => [q.id, q]))

  // Latest submission per testId
  const latestSub = new Map<string, (typeof submissions)[number]>()
  for (const s of submissions) {
    if (!latestSub.has(s.testId)) latestSub.set(s.testId, s)
  }

  // Test → package mapping
  const testToPackage = new Map<string, { id: string; mode: 'STANDARD' | 'ADAPTIVE_PACKAGE' }>()
  for (const pkg of packages) {
    const mode = pkg.mode as 'STANDARD' | 'ADAPTIVE_PACKAGE'
    for (const tid of [pkg.standardTestId, pkg.easyTestId, pkg.mediumTestId, pkg.hardTestId]) {
      if (tid) testToPackage.set(tid, { id: pkg.id, mode })
    }
  }

  // 5. Assemble result
  return tests.map((test) => {
    const qIds = test.questionIds as string[]
    const testQuestions = qIds.map((id) => qMap.get(id)).filter(Boolean)
    const totalPoints = Math.round(testQuestions.reduce((s, q) => s + (q!.points ?? 1), 0) * 100) / 100
    const subject = testQuestions[0]?.subject ?? 'Toán'
    const pkg = testToPackage.get(test.id) ?? null
    const sub = latestSub.get(test.id) ?? null

    return {
      testId: test.id,
      packageId: pkg?.id ?? null,
      title: test.title,
      subject,
      topic: '',
      timeLimitMinutes: test.timeLimitMinutes,
      questionCount: qIds.length,
      totalPoints,
      difficultyLevel: String(test.difficultyLevel),
      packageMode: pkg?.mode ?? null,
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
  options: string[] | null          // MULTIPLE_CHOICE only
  subStatements: QuizSubStatement[] | null  // TRUE_FALSE_GROUP only
  points: number
}

export interface QuizTakingData {
  testId: string
  title: string
  timeLimitMinutes: number
  previousAttempts: number
  questions: QuizTakingQuestion[]
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
      // correctAnswer intentionally omitted
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

  // Verify student is in the class
  const membership = await prisma.classMember.findFirst({
    where: { classId: test.classId, studentId },
  })
  if (!membership) return null

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
      },
    }),
    prisma.submission.count({ where: { testId, studentId } }),
  ])

  // Preserve teacher's question ordering
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

  return {
    testId: test.id,
    title: test.title,
    timeLimitMinutes: test.timeLimitMinutes,
    previousAttempts: prevSubmissions,
    questions: orderedQuestions,
  }
}
