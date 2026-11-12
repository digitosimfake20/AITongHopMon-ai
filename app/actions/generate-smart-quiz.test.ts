import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  knowledgeFindMany: vi.fn(),
  profileFindUnique: vi.fn(),
  memberFindFirst: vi.fn(),
  collectPracticeQuestionsFromBank: vi.fn(),
  createQuestionsInTransaction: vi.fn(),
  testCreate: vi.fn(),
  bustCacheTags: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    studentKnowledgeState: { findMany: mocks.knowledgeFindMany },
    studentCognitiveProfile: { findUnique: mocks.profileFindUnique },
    classMember: { findFirst: mocks.memberFindFirst },
  },
  prismaDirect: {
    $transaction: async (
      fn: (tx: { test: { create: typeof mocks.testCreate } }) => Promise<unknown>,
    ) => fn({ test: { create: mocks.testCreate } }),
  },
}))

vi.mock('@/lib/system-test/mix-practice-from-bank', () => ({
  collectPracticeQuestionsFromBank: mocks.collectPracticeQuestionsFromBank,
}))

vi.mock('@/lib/system-test/materialize-questions', () => ({
  createQuestionsInTransaction: mocks.createQuestionsInTransaction,
}))

vi.mock('@/lib/cache/cached-query', () => ({
  bustCacheTags: mocks.bustCacheTags,
}))

import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'

const FORGED_TITLE = 'Forged Admin Topic'
const OWNED_TITLE = 'Phương trình bậc nhất'
const OWNED_KEY = 'node-owned-1'
const WEAK_FALLBACK_TITLE = 'Hình học không gian'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSessionUser.mockResolvedValue({
    id: 'stu-1',
    email: 's@example.com',
    fullName: 'Student',
    role: 'student',
  })
  mocks.memberFindFirst.mockResolvedValue({ classId: 'class-1' })
  mocks.profileFindUnique.mockResolvedValue(null)
  mocks.collectPracticeQuestionsFromBank.mockResolvedValue({
    questions: [{ stem: 'q1', topic: OWNED_TITLE }],
    primaryWeakTopic: OWNED_TITLE,
    weakFormLabel: null,
    sourceTitles: ['bank-1'],
  })
  mocks.createQuestionsInTransaction.mockResolvedValue([{ id: 'q-1' }])
  mocks.testCreate.mockResolvedValue({ id: 'test-1' })
})

describe('generateSmartQuizAction topicTitles trust', () => {
  it('ignores forged topicTitles and resolves titles from owned topicKeys', async () => {
    mocks.knowledgeFindMany.mockImplementation(
      async (args: { where: { studentId?: string; nodeId?: { in: string[] } } }) => {
        if (args.where.nodeId?.in) {
          expect(args.where.studentId).toBe('stu-1')
          expect(args.where.nodeId.in).toEqual([OWNED_KEY])
          return [{ node: { title: OWNED_TITLE } }]
        }
        return []
      },
    )

    const result = await generateSmartQuizAction({
      topicKeys: [OWNED_KEY],
      topicTitles: [FORGED_TITLE],
    })

    expect(result.success).toBe(true)
    expect(mocks.collectPracticeQuestionsFromBank).toHaveBeenCalledWith(
      [OWNED_TITLE],
      expect.objectContaining({ topicKeys: [OWNED_KEY] }),
    )
    const weakTopicsArg = mocks.collectPracticeQuestionsFromBank.mock.calls[0]?.[0] as string[]
    expect(weakTopicsArg).not.toContain(FORGED_TITLE)
    expect(JSON.stringify(mocks.collectPracticeQuestionsFromBank.mock.calls)).not.toContain(
      FORGED_TITLE,
    )
  })

  it('ignores forged topicTitles alone and uses server weak-state fallback', async () => {
    mocks.knowledgeFindMany.mockResolvedValue([
      { node: { title: WEAK_FALLBACK_TITLE } },
    ])
    mocks.collectPracticeQuestionsFromBank.mockResolvedValue({
      questions: [{ stem: 'q1', topic: WEAK_FALLBACK_TITLE }],
      primaryWeakTopic: WEAK_FALLBACK_TITLE,
      weakFormLabel: null,
      sourceTitles: ['bank-1'],
    })

    const result = await generateSmartQuizAction({
      topicTitles: [FORGED_TITLE],
    })

    expect(result.success).toBe(true)
    expect(mocks.collectPracticeQuestionsFromBank).toHaveBeenCalledWith(
      [WEAK_FALLBACK_TITLE],
      expect.any(Object),
    )
    expect(JSON.stringify(mocks.collectPracticeQuestionsFromBank.mock.calls)).not.toContain(
      FORGED_TITLE,
    )
  })
})
