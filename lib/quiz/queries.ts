import prisma from '@/lib/prisma'
import type { DifficultyLevel, ParsedQuestion, QuizMode, TrueFalseSubQuestion } from '@/lib/quiz/types'

export interface QuizPackageTestSummary {
  id: string
  title: string
  difficultyLevel: DifficultyLevel
  questionCount: number
  timeLimitMinutes: number
  submittedCount: number
  averageScore: number
}

export interface QuizPackageSummary {
  id: string
  title: string
  description: string | null
  mode: QuizMode
  createdAt: Date
  tests: QuizPackageTestSummary[]
}

// =============================================================================
// Edit-mode data loader
// =============================================================================

export interface EditableTest {
  id: string
  title: string
  difficultyLevel: DifficultyLevel
  timeLimitMinutes: number
  subject: string
  topic: string
  questions: ParsedQuestion[]
}

export interface QuizPackageEditData {
  id: string
  title: string
  description: string | null
  mode: QuizMode
  classId: string
  tests: EditableTest[]
}

function dbQuestionToParsed(q: {
  id: string
  type: string
  content: string
  options: unknown
  correctOption: string | null
  explanation: string | null
  subject: string
  topic: string
}): ParsedQuestion {
  const base = { id: crypto.randomUUID(), content: q.content, explanation: q.explanation ?? undefined, points: 1 as const }

  if (q.type === 'MULTIPLE_CHOICE') {
    const opts = Array.isArray(q.options) ? (q.options as string[]) : ['', '', '', '']
    const correct = q.correctOption ? Math.max(0, 'ABCD'.indexOf(q.correctOption[0]?.toUpperCase() ?? '')) : 0
    const padded = [...opts, '', '', '', ''].slice(0, 4)
    return { ...base, type: 'MULTIPLE_CHOICE', options: padded, correctAnswer: correct >= 0 ? correct : 0 }
  }

  if (q.type === 'TRUE_FALSE_GROUP') {
    const rawSubs = Array.isArray(q.options)
      ? (q.options as Array<{ label?: string; content?: string; correctAnswer?: boolean }>)
      : []
    const subQuestions: TrueFalseSubQuestion[] = rawSubs.map((sq, i) => ({
      id: crypto.randomUUID(),
      label: sq.label ?? String.fromCharCode(97 + i),
      content: sq.content ?? '',
      correctAnswer: typeof sq.correctAnswer === 'boolean' ? sq.correctAnswer : undefined,
    }))
    return { ...base, type: 'TRUE_FALSE_GROUP', subQuestions }
  }

  if (q.type === 'SHORT_ANSWER') {
    return { ...base, type: 'SHORT_ANSWER', correctAnswer: q.correctOption ?? '' }
  }

  return { ...base, type: 'ESSAY' }
}

async function loadTestWithQuestions(testId: string): Promise<{
  id: string; title: string; difficultyLevel: DifficultyLevel
  timeLimitMinutes: number; subject: string; topic: string; questionIds: unknown
} | null> {
  return prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, title: true, difficultyLevel: true, timeLimitMinutes: true, questionIds: true },
  }) as Promise<{ id: string; title: string; difficultyLevel: DifficultyLevel; timeLimitMinutes: number; subject: string; topic: string; questionIds: unknown } | null>
}

export async function getQuizPackageForEdit(
  packageId: string,
  teacherId: string,
): Promise<QuizPackageEditData | null> {
  const pkg = await prisma.quizPackage.findFirst({
    where: { id: packageId, createdBy: teacherId },
    select: {
      id: true, title: true, description: true, mode: true, classId: true,
      standardTestId: true, easyTestId: true, mediumTestId: true, hardTestId: true,
    },
  })
  if (!pkg) return null

  const testIds =
    pkg.mode === 'STANDARD'
      ? [pkg.standardTestId].filter(Boolean)
      : [pkg.easyTestId, pkg.mediumTestId, pkg.hardTestId].filter(Boolean)

  const rawTests = await prisma.test.findMany({
    where: { id: { in: testIds as string[] } },
    select: { id: true, title: true, difficultyLevel: true, timeLimitMinutes: true, questionIds: true },
  })

  const testMap = new Map(rawTests.map((t) => [t.id, t]))
  const orderedTests = (testIds as string[]).map((id) => testMap.get(id)).filter(Boolean) as typeof rawTests

  const tests: EditableTest[] = await Promise.all(
    orderedTests.map(async (test) => {
      const qIds = Array.isArray(test.questionIds) ? (test.questionIds as string[]) : []
      const dbQuestions = qIds.length > 0
        ? await prisma.question.findMany({
            where: { id: { in: qIds } },
            select: { id: true, type: true, content: true, options: true, correctOption: true, explanation: true, subject: true, topic: true },
          })
        : []

      const qMap = new Map(dbQuestions.map((q) => [q.id, q]))
      const ordered = qIds.map((id) => qMap.get(id)).filter(Boolean) as typeof dbQuestions

      // Extract subject/topic from first question (all questions in a test share these)
      const firstQ = ordered[0]
      return {
        id: test.id,
        title: test.title,
        difficultyLevel: test.difficultyLevel,
        timeLimitMinutes: test.timeLimitMinutes,
        subject: firstQ?.subject ?? 'Toán',
        topic: firstQ?.topic ?? '',
        questions: ordered.map(dbQuestionToParsed),
      }
    }),
  )

  return { id: pkg.id, title: pkg.title, description: pkg.description, mode: pkg.mode, classId: pkg.classId, tests }
}

type PackageTestMeta = {
  id: string
  title: string
  difficultyLevel: DifficultyLevel
  questionIds: unknown
  timeLimitMinutes: number
}

function summarizeTestFromAgg(
  test: PackageTestMeta | null | undefined,
  stats: { submittedCount: number; averageScore: number } | undefined,
): QuizPackageTestSummary | null {
  if (!test) return null
  return {
    id: test.id,
    title: test.title,
    difficultyLevel: test.difficultyLevel,
    questionCount: Array.isArray(test.questionIds) ? test.questionIds.length : 0,
    timeLimitMinutes: test.timeLimitMinutes,
    submittedCount: stats?.submittedCount ?? 0,
    averageScore: stats?.averageScore ?? 0,
  }
}

async function getQuizPackagesForClassUncached(classId: string) {
  const testSelect = {
    id: true,
    title: true,
    difficultyLevel: true,
    questionIds: true,
    timeLimitMinutes: true,
  } as const

  const packages = await prisma.quizPackage.findMany({
    where: { classId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      mode: true,
      createdAt: true,
      standardTest: { select: testSelect },
      easyTest: { select: testSelect },
      mediumTest: { select: testSelect },
      hardTest: { select: testSelect },
    },
  })

  const testIds = [
    ...new Set(
      packages.flatMap((pkg) => {
        const tests = [pkg.standardTest, pkg.easyTest, pkg.mediumTest, pkg.hardTest]
        return tests.flatMap((t) => (t ? [t.id] : []))
      }),
    ),
  ]

  const submissionAggs =
    testIds.length > 0
      ? await prisma.submission.groupBy({
          by: ['testId'],
          where: { testId: { in: testIds } },
          _count: { id: true },
          _avg: { score: true },
        })
      : []

  const statsByTestId = new Map(
    submissionAggs.map((row) => [
      row.testId,
      {
        submittedCount: row._count.id,
        averageScore:
          row._avg.score != null ? Math.round(Number(row._avg.score) * 10) / 10 : 0,
      },
    ]),
  )

  return packages.map((pkg) => {
    const tests =
      pkg.mode === 'STANDARD'
        ? [summarizeTestFromAgg(pkg.standardTest, statsByTestId.get(pkg.standardTest?.id ?? ''))]
        : [
            summarizeTestFromAgg(pkg.easyTest, statsByTestId.get(pkg.easyTest?.id ?? '')),
            summarizeTestFromAgg(pkg.mediumTest, statsByTestId.get(pkg.mediumTest?.id ?? '')),
            summarizeTestFromAgg(pkg.hardTest, statsByTestId.get(pkg.hardTest?.id ?? '')),
          ]

    return {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      mode: pkg.mode,
      createdAt: pkg.createdAt.toISOString(),
      tests: tests.filter((test): test is QuizPackageTestSummary => test !== null),
    }
  })
}

export async function getQuizPackagesForClass(classId: string): Promise<QuizPackageSummary[]> {
  const { cachedQuery } = await import('@/lib/cache/cached-query')
  const { CacheTags, CacheTTL } = await import('@/lib/cache/tags')
  const { asDateRequired } = await import('@/lib/cache/revive')

  const cached = cachedQuery(getQuizPackagesForClassUncached, {
    keyParts: ['packages'],
    tags: [CacheTags.packages(classId), CacheTags.submissions(classId)],
    revalidate: CacheTTL.packages,
  })
  const rows = await cached(classId)
  return rows.map((pkg) => ({
    ...pkg,
    createdAt: asDateRequired(pkg.createdAt),
  }))
}
