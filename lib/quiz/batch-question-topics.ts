import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export type QuestionTopicUpdate = {
  id: string
  topic: string
  topicKey: string
}

/**
 * Persist topic/topicKey for many questions in one SQL round-trip.
 * Skips rows whose values are already current.
 */
export async function batchUpdateQuestionTopics(
  updates: QuestionTopicUpdate[],
): Promise<void> {
  if (updates.length === 0) return

  const values = updates.map(
    (u) => Prisma.sql`(${u.id}::uuid, ${u.topic}, ${u.topicKey})`,
  )

  await prisma.$executeRaw`
    UPDATE core.questions AS q
    SET
      topic = v.topic,
      topic_key = v.topic_key
    FROM (VALUES ${Prisma.join(values)}) AS v(id, topic, topic_key)
    WHERE q.id = v.id
      AND (
        q.topic IS DISTINCT FROM v.topic
        OR q.topic_key IS DISTINCT FROM v.topic_key
      )
  `
}
