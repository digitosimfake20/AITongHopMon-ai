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

interface RawTest {
  id: string
  title: string
  difficultyLevel: DifficultyLevel
  questionIds: unknown
  timeLimitMinutes: number
  submissions: { score: unknown }[]
}

function summarizeTest(test: RawTest | null): QuizPackageTestSummary | null {
  if (!test) return null
  const scores = test.submissions.map((s) => Number(s.score))
  const averageScore =
    scores.length > 0 ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0

  return {
    id: test.id,
    title: test.title,
    difficultyLevel: test.difficultyLevel,
    questionCount: Array.isArray(test.questionIds) ? test.questionIds.length : 0,
    timeLimitMinutes: test.timeLimitMinutes,
    submittedCount: test.submissions.length,
    averageScore,
  }
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

export async function getQuizPackagesForClass(classId: string): Promise<QuizPackageSummary[]> {
  const packages = await prisma.quizPackage.findMany({
    where: { classId },
    orderBy: { createdAt: 'desc' },
    include: {
      standardTest: { include: { submissions: { select: { score: true } } } },
      easyTest: { include: { submissions: { select: { score: true } } } },
      mediumTest: { include: { submissions: { select: { score: true } } } },
      hardTest: { include: { submissions: { select: { score: true } } } },
    },
  })

  return packages.map((pkg) => {
    const tests =
      pkg.mode === 'STANDARD'
        ? [summarizeTest(pkg.standardTest)]
        : [summarizeTest(pkg.easyTest), summarizeTest(pkg.mediumTest), summarizeTest(pkg.hardTest)]

    return {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      mode: pkg.mode,
      createdAt: pkg.createdAt,
      tests: tests.filter((test): test is QuizPackageTestSummary => test !== null),
    }
  })
}
