/**
 * Per-student mastery persist: one transaction serializes read→BKT→upsert
 * so concurrent submits do not last-write-win.
 */
import { prismaDirect } from '@/lib/prisma'
import { computeTopicMasteryUpdate } from '@/lib/knowledge/mastery-evidence'

export type MasteryBatchInput = {
  topicName: string
  nodeId: string
  subject: string
  answers: Array<{ isCorrect: boolean; timeSpentSeconds: number }>
}

export type MasteryPersistResult = {
  topicName: string
  topicKey: string
  pMastery: number
  answers: Array<{ isCorrect: boolean; timeSpentSeconds: number }>
}

/** Injectable client: prismaDirect in prod, mock in tests. */
export type MasteryDbClient = {
  $transaction: <T>(fn: (tx: MasteryTxLike) => Promise<T>) => Promise<T>
}

type MasteryTxLike = {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>
  knowledgeNode: { upsert: (args: unknown) => Promise<unknown> }
  studentKnowledgeState: {
    findMany: (args: unknown) => Promise<Array<{ nodeId: string; pMastery: unknown }>>
    upsert: (args: unknown) => Promise<unknown>
  }
}

export async function persistStudentMasteryBatches(
  studentId: string,
  batches: MasteryBatchInput[],
  client: MasteryDbClient = prismaDirect as MasteryDbClient,
): Promise<MasteryPersistResult[]> {
  if (batches.length === 0) return []

  return client.$transaction(async (tx) => {
    // Serialize all mastery writes for this student (lost-update safe).
    // shortcut: needs real DIRECT_URL / session client; pooler interactive tx may not hold the lock — upgrade when DOD-06 lands.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId}))`

    const nodeIds = batches.map((b) => b.nodeId)
    const existingStates = await tx.studentKnowledgeState.findMany({
      where: { studentId, nodeId: { in: nodeIds } },
      select: { nodeId: true, pMastery: true },
    })
    const priorMastery = new Map(
      existingStates.map((s) => [s.nodeId, Number(s.pMastery)] as const),
    )

    const results: MasteryPersistResult[] = []
    for (const batch of batches) {
      await tx.knowledgeNode.upsert({
        where: { id: batch.nodeId },
        create: {
          id: batch.nodeId,
          subject: batch.subject,
          title: batch.topicName,
          difficultyLevel: 1,
        },
        update: {
          title: batch.topicName,
          subject: batch.subject,
        },
      })

      const currentMastery = priorMastery.get(batch.nodeId) ?? 0.2
      const mastery = computeTopicMasteryUpdate(currentMastery, batch.answers)
      const practicedAt = new Date()

      await tx.studentKnowledgeState.upsert({
        where: { studentId_nodeId: { studentId, nodeId: batch.nodeId } },
        create: {
          studentId,
          nodeId: batch.nodeId,
          pMastery: mastery,
          lastPracticedAt: practicedAt,
        },
        update: {
          pMastery: mastery,
          lastPracticedAt: practicedAt,
        },
      })

      results.push({
        topicName: batch.topicName,
        topicKey: batch.nodeId,
        pMastery: mastery,
        answers: batch.answers,
      })
    }

    return results
  })
}
