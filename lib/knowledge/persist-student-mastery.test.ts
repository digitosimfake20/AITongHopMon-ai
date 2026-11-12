import { describe, expect, it, vi } from 'vitest'
import { computeTopicMasteryUpdate } from '@/lib/knowledge/mastery-evidence'
import {
  persistStudentMasteryBatches,
  type MasteryDbClient,
} from '@/lib/knowledge/persist-student-mastery'

type StateRow = { nodeId: string; pMastery: number }

function makeClient(initial: StateRow[] = []) {
  const store = new Map(initial.map((r) => [r.nodeId, r.pMastery]))
  const ops: string[] = []
  let held = false
  const waiters: Array<() => void> = []

  const tx = {
    $executeRaw: vi.fn(async () => {
      ops.push('lock')
      while (held) {
        await new Promise<void>((resolve) => waiters.push(resolve))
      }
      held = true
    }),
    knowledgeNode: {
      upsert: vi.fn(async ({ where }: { where: { id: string } }) => {
        ops.push(`node:${where.id}`)
      }),
    },
    studentKnowledgeState: {
      findMany: vi.fn(async ({ where }: { where: { nodeId: { in: string[] } } }) => {
        ops.push('read')
        return where.nodeId.in
          .filter((id) => store.has(id))
          .map((id) => ({ nodeId: id, pMastery: store.get(id)! }))
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { studentId_nodeId: { nodeId: string } }
          create: { pMastery: number }
          update: { pMastery: number }
        }) => {
          const nodeId = where.studentId_nodeId.nodeId
          const next = store.has(nodeId) ? update.pMastery : create.pMastery
          store.set(nodeId, next)
          ops.push(`state:${nodeId}:${next}`)
        },
      ),
    },
  }

  const client = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => {
      ops.push('tx')
      try {
        return await fn(tx)
      } finally {
        held = false
        const wake = waiters.shift()
        if (wake) wake()
      }
    }),
  }

  return { client: client as unknown as MasteryDbClient, store, ops, tx }
}

const batch = {
  topicName: 'Đại số',
  nodeId: 'node-a',
  subject: 'Toán',
  answers: [{ isCorrect: true, timeSpentSeconds: 20 }],
}

describe('persistStudentMasteryBatches', () => {
  it('runs lock → read → upsert inside one client.$transaction', async () => {
    const { client, ops } = makeClient([{ nodeId: 'node-a', pMastery: 0.5 }])

    await persistStudentMasteryBatches('student-1', [batch], client)

    expect(client.$transaction).toHaveBeenCalledTimes(1)
    expect(ops[0]).toBe('tx')
    expect(ops.slice(1, 4)).toEqual(['lock', 'read', 'node:node-a'])
    expect(ops.some((o) => o.startsWith('state:node-a:'))).toBe(true)
  })

  it('serializes concurrent persists so the second applies BKT on the first result', async () => {
    const { client, store } = makeClient([{ nodeId: 'node-a', pMastery: 0.5 }])
    const a = { ...batch, answers: [{ isCorrect: true, timeSpentSeconds: 10 }] }
    const b = { ...batch, answers: [{ isCorrect: true, timeSpentSeconds: 10 }] }

    await Promise.all([
      persistStudentMasteryBatches('student-1', [a], client),
      persistStudentMasteryBatches('student-1', [b], client),
    ])

    const afterFirst = computeTopicMasteryUpdate(0.5, a.answers)
    const expected = computeTopicMasteryUpdate(afterFirst, b.answers)
    expect(store.get('node-a')).toBeCloseTo(expected, 6)
    expect(client.$transaction).toHaveBeenCalledTimes(2)
  })
})
