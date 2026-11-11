import { beforeEach, describe, expect, it, vi } from 'vitest'

type Committed = {
  submission: { id: string; status: string } | null
  session: {
    round1SubmissionId?: string | null
    round2SubmissionId?: string | null
    round2TestId?: string | null
  } | null
}

const h = vi.hoisted(() => {
  const committed: Committed = { submission: null, session: null }
  const counts = {
    txCreate: 0,
    globalCreate: 0,
    txUpsert: 0,
    globalUpsert: 0,
    txSessionUpdate: 0,
    globalSessionUpdate: 0,
  }
  let failSession = false
  const afterCallbacks: Array<() => Promise<void>> = []

  function apply(mode: 'tx' | 'global', dest: Committed, kind: string, args: any) {
    if (kind === 'create') {
      if (mode === 'tx') counts.txCreate += 1
      else counts.globalCreate += 1
      const row = { id: args.data.id ?? 'sub-1', status: args.data.status }
      dest.submission = row
      return row
    }
    if (kind === 'submissionUpdate') {
      const row = { id: args.where.id, status: args.data.status }
      dest.submission = row
      return row
    }
    if (kind === 'upsert' || kind === 'sessionUpdate') {
      if (kind === 'upsert') {
        if (mode === 'tx') counts.txUpsert += 1
        else counts.globalUpsert += 1
      } else if (mode === 'tx') counts.txSessionUpdate += 1
      else counts.globalSessionUpdate += 1
      if (failSession) throw new Error('session write failed')
      dest.session =
        kind === 'upsert'
          ? {
              round1SubmissionId: args.create.round1SubmissionId,
              round2TestId: args.create.round2TestId,
            }
          : { round2SubmissionId: args.data.round2SubmissionId }
      return dest.session
    }
    throw new Error(`unexpected op ${kind}`)
  }

  function stage(kind: string, args: unknown) {
    let taken = false
    const promise = Promise.resolve().then(() => {
      if (taken) return undefined
      return apply('global', committed, kind, args)
    })
    return Object.assign(promise, {
      _take() {
        taken = true
      },
      _kind: kind,
      _args: args,
    })
  }

  const prisma = {
    test: { findUnique: vi.fn() },
    classMember: { findFirst: vi.fn() },
    classTest: { findFirst: vi.fn() },
    question: { findMany: vi.fn() },
    submission: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: (args: unknown) => stage('create', args),
      update: (args: unknown) => stage('submissionUpdate', args),
    },
    adaptiveStudentSession: {
      upsert: (args: unknown) => stage('upsert', args),
      update: (args: unknown) => stage('sessionUpdate', args),
    },
    $transaction: vi.fn(async (ops: unknown) => {
      if (!Array.isArray(ops)) throw new Error('expected batch transaction')
      for (const op of ops) op._take()
      const scratch: Committed = { submission: null, session: null }
      const results = []
      for (const op of ops) {
        results.push(apply('tx', scratch, op._kind, op._args))
      }
      committed.submission = scratch.submission
      committed.session = scratch.session
      return results
    }),
  }

  return {
    committed,
    counts,
    afterCallbacks,
    prisma,
    get failSession() {
      return failSession
    },
    set failSession(value: boolean) {
      failSession = value
    },
    reset() {
      committed.submission = null
      committed.session = null
      failSession = false
      afterCallbacks.length = 0
      counts.txCreate = 0
      counts.globalCreate = 0
      counts.txUpsert = 0
      counts.globalUpsert = 0
      counts.txSessionUpdate = 0
      counts.globalSessionUpdate = 0
    },
  }
})

vi.mock('next/server', () => ({
  after: (cb: () => Promise<void>) => {
    h.afterCallbacks.push(cb)
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: h.prisma,
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: async () => ({
    id: 'student-1',
    email: 's@example.com',
    fullName: 'Hoc sinh',
    role: 'student',
  }),
}))

vi.mock('@/lib/ai/pipeline', () => ({
  runPostSubmissionAIPipeline: async () => {},
}))

vi.mock('@/lib/cache/invalidate', () => ({
  invalidateAfterSubmit: () => {},
}))

import { submitQuizAction } from '@/app/actions/quiz-submission'

const MEDIUM = 'medium-test'
const EASY = 'easy-test'
const HARD = 'hard-test'
const QUESTION = 'q-1'

function classTestRow(sessions: Array<Record<string, unknown>> = []) {
  return {
    id: 'class-test-1',
    classId: 'class-1',
    startTime: new Date(Date.now() - 60_000),
    endTime: new Date(Date.now() + 3_600_000),
    isAdaptive: true,
    testId: null,
    easyTestId: EASY,
    mediumTestId: MEDIUM,
    hardTestId: HARD,
    maxAttempts: 2,
    passScoreThreshold: 8,
    adaptiveSessions: sessions,
  }
}

function answerInput(testId: string) {
  return {
    testId,
    totalTimeSpentSeconds: 12,
    clientStartedAtMs: Date.now() - 12_000,
    answers: [
      {
        questionId: QUESTION,
        questionType: 'MULTIPLE_CHOICE' as const,
        answer: 'A',
        timeSpentSeconds: 12,
      },
    ],
  }
}

beforeEach(() => {
  h.reset()
  h.prisma.test.findUnique.mockResolvedValue({
    id: MEDIUM,
    classId: 'class-1',
    title: 'Kiểm tra giữa kỳ',
    timeLimitMinutes: 15,
    questionIds: [QUESTION],
  })
  h.prisma.submission.findFirst.mockResolvedValue(null)
  h.prisma.submission.count.mockResolvedValue(0)
  h.prisma.classMember.findFirst.mockResolvedValue({ id: 'member-1' })
  h.prisma.classTest.findFirst.mockResolvedValue(classTestRow())
  h.prisma.question.findMany.mockResolvedValue([
    {
      id: QUESTION,
      type: 'MULTIPLE_CHOICE',
      correctOption: 'A',
      points: 1,
      topic: 'Đại số',
      subject: 'Toán',
    },
  ])
})

describe('submitQuizAction adaptive session', () => {
  it('binds round1 in the same transaction as the completed medium submit', async () => {
    const result = await submitQuizAction(answerInput(MEDIUM))

    expect(result.success).toBe(true)
    const submissionId = result.data?.submissionId
    expect(submissionId).toEqual(expect.any(String))
    if (!submissionId) return
    expect(h.committed.submission).toEqual({ id: submissionId, status: 'COMPLETED' })
    expect(h.committed.session).toMatchObject({
      round1SubmissionId: submissionId,
      round2TestId: HARD,
    })
    expect(h.counts.txCreate).toBe(1)
    expect(h.counts.txUpsert).toBe(1)
    expect(h.counts.globalCreate).toBe(0)
    expect(h.counts.globalUpsert).toBe(0)

    const bound = h.committed.session
    expect(h.afterCallbacks).toHaveLength(1)
    await h.afterCallbacks[0]!()
    expect(h.committed.session).toEqual(bound)
    expect(h.counts.txUpsert).toBe(1)
    expect(h.counts.globalUpsert).toBe(0)
  })

  it('binds round2 in the same transaction as the completed submit', async () => {
    h.prisma.test.findUnique.mockResolvedValue({
      id: EASY,
      classId: 'class-1',
      title: 'Kiểm tra giữa kỳ',
      timeLimitMinutes: 15,
      questionIds: [QUESTION],
    })
    h.prisma.classTest.findFirst.mockResolvedValue(
      classTestRow([
        {
          round1SubmissionId: 'sub-r1',
          round2TestId: EASY,
          round2SubmissionId: null,
        },
      ]),
    )

    const result = await submitQuizAction(answerInput(EASY))

    expect(result.success).toBe(true)
    const submissionId = result.data?.submissionId
    expect(submissionId).toEqual(expect.any(String))
    if (!submissionId) return
    expect(h.committed.submission).toEqual({ id: submissionId, status: 'COMPLETED' })
    expect(h.committed.session).toMatchObject({ round2SubmissionId: submissionId })
    expect(h.counts.txCreate).toBe(1)
    expect(h.counts.txSessionUpdate).toBe(1)
    expect(h.counts.globalCreate).toBe(0)
    expect(h.counts.globalSessionUpdate).toBe(0)
  })

  it('does not leave a completed submit when the session write fails', async () => {
    h.failSession = true

    const result = await submitQuizAction(answerInput(MEDIUM))
    for (const cb of h.afterCallbacks) await cb()

    expect(result).toMatchObject({ success: false })
    expect(h.committed.submission).toBeNull()
    expect(h.committed.session).toBeNull()
  })
})
