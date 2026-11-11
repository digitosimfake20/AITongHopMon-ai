import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  submissionFindUnique: vi.fn(),
  consentFindUnique: vi.fn(),
  flagCount: vi.fn(),
  flagCreate: vi.fn(),
  flagDelete: vi.fn(),
  evidenceUpdate: vi.fn(),
  getSessionUser: vi.fn(),
  uploadAnticheatEvidenceObject: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    submission: { findUnique: mocks.submissionFindUnique },
    anticheatConsent: { findUnique: mocks.consentFindUnique },
    anticheatFlag: {
      count: mocks.flagCount,
      create: mocks.flagCreate,
      delete: mocks.flagDelete,
    },
    anticheatEvidence: { update: mocks.evidenceUpdate },
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/anticheat-storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/supabase/anticheat-storage')>()
  return {
    ...actual,
    uploadAnticheatEvidenceObject: mocks.uploadAnticheatEvidenceObject,
  }
})

import {
  recordFlagAction,
  uploadAnticheatEvidenceAction,
} from '@/app/actions/anticheat'

const CLIENT_PATH = 'forged/client-frame.jpg'
const SERVER_PATH = 'sub-1/flag-1.jpg'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSessionUser.mockResolvedValue({
    id: 'stu-1',
    email: 's@example.com',
    fullName: 'Student',
    role: 'student',
  })
  mocks.submissionFindUnique.mockResolvedValue({
    id: 'sub-1',
    studentId: 'stu-1',
  })
  mocks.consentFindUnique.mockResolvedValue({ outcome: 'granted' })
  mocks.flagCount.mockResolvedValue(0)
  mocks.flagCreate.mockResolvedValue({
    id: 'flag-1',
    evidence: { id: 'ev-1' },
  })
  mocks.evidenceUpdate.mockResolvedValue({})
  mocks.uploadAnticheatEvidenceObject.mockResolvedValue({
    framePath: SERVER_PATH,
  })
})

describe('recordFlagAction', () => {
  it('does not store a client-supplied evidenceMeta.framePath', async () => {
    const forged = {
      submissionId: 'sub-1',
      trigger: 'hint' as const,
      hashWindow: [{ at: '2026-01-01T00:00:00.000Z', phash: 'ab' }],
      evidenceMeta: { framePath: CLIENT_PATH },
    }

    const result = await recordFlagAction(forged)

    expect(result.success).toBe(true)
    expect(JSON.stringify(mocks.flagCreate.mock.calls)).not.toContain(CLIENT_PATH)
    const created = mocks.flagCreate.mock.calls[0]?.[0] as {
      data: { evidence?: { create: { framePath?: string | null } } }
    }
    expect(created.data.evidence?.create.framePath ?? null).toBeNull()
  })
})

describe('uploadAnticheatEvidenceAction', () => {
  it('stores only the framePath from uploadAnticheatEvidenceObject', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 4]).toString('base64')
    const forged = {
      submissionId: 'sub-1',
      trigger: 'frozen' as const,
      clientAt: '2026-01-01T00:00:00.000Z',
      jpegBase64: jpeg,
      evidenceMeta: { framePath: CLIENT_PATH },
    }

    const result = await uploadAnticheatEvidenceAction(forged)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.framePath).toBe(SERVER_PATH)
    expect(mocks.evidenceUpdate).toHaveBeenCalledWith({
      where: { id: 'ev-1' },
      data: { framePath: SERVER_PATH },
    })
    expect(JSON.stringify(mocks.flagCreate.mock.calls)).not.toContain(CLIENT_PATH)
    expect(JSON.stringify(mocks.evidenceUpdate.mock.calls)).not.toContain(
      CLIENT_PATH,
    )
  })
})
