import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { toDbQuestion } from '@/lib/system-test/question-mapper'
import { publishSystemTestSchema } from '@/lib/validations/system-test'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'

type ParsedQuestion = z.infer<typeof publishSystemTestSchema.shape.questions>[number]

const CREATE_MANY_BATCH = 100

/** Interactive transactions that materialize many questions (assign test / adaptive group). */
export const MATERIALIZE_TEST_TX_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const

export async function createQuestionsInTransaction(
  tx: Prisma.TransactionClient,
  questions: ParsedQuestion[],
  defaults: { subject: string; topicFallback: string; difficulty: string },
): Promise<{ id: string }[]> {
  const prepared = questions.map((q) => {
    const { options, correctOption, type } = toDbQuestion(q)
    const topic = normalizeTopicName(q.topic?.trim() || defaults.topicFallback)
    return {
      id: randomUUID(),
      subject: defaults.subject,
      topic,
      topicKey: topicToNodeId(topic),
      difficulty: defaults.difficulty,
      type,
      content: q.content,
      options,
      correctOption,
      explanation: q.explanation ?? null,
      points: q.points ?? 1,
    }
  })

  for (let i = 0; i < prepared.length; i += CREATE_MANY_BATCH) {
    await tx.question.createMany({ data: prepared.slice(i, i + CREATE_MANY_BATCH) })
  }

  return prepared.map(({ id }) => ({ id }))
}

export async function materializeSystemTestInTransaction(
  tx: Prisma.TransactionClient,
  systemTest: {
    title: string
    subject: string
    questions: unknown
    durationMinutes: number
  },
  classId: string,
  difficulty: string,
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD',
  createdBy: string,
  titleSuffix: string,
) {
  const questionsRaw = systemTest.questions
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    throw new Error(`Đề ${titleSuffix} không có câu hỏi`)
  }

  const questionsParsed = publishSystemTestSchema.shape.questions.safeParse(questionsRaw)
  if (!questionsParsed.success) {
    throw new Error(`Cấu trúc câu hỏi đề ${titleSuffix} không hợp lệ`)
  }

  const createdQuestions = await createQuestionsInTransaction(tx, questionsParsed.data, {
    subject: systemTest.subject,
    topicFallback: systemTest.title,
    difficulty: difficulty.toLowerCase(),
  })

  return tx.test.create({
    data: {
      title: `${systemTest.title} (${titleSuffix})`,
      classId,
      questionIds: createdQuestions.map((q) => q.id),
      timeLimitMinutes: systemTest.durationMinutes,
      difficultyLevel,
      createdBy,
    },
    select: { id: true },
  })
}

export function countQuestions(questions: unknown): number {
  return Array.isArray(questions) ? questions.length : 0
}
