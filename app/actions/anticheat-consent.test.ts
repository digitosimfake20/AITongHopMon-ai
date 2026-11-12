import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findFirst, getSessionUser } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    submission: { findFirst },
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser,
}))

vi.mock('@/lib/adaptive/find-class-test', () => ({
  findClassTestByTestId: vi.fn(),
}))

vi.mock('@/lib/quiz/submission-access', () => ({
  canReadSubmission: vi.fn(),
}))

vi.mock('@/lib/supabase/anticheat-storage', () => ({
  decodeJpegBase64: vi.fn(),
  removeAnticheatEvidenceObjects: vi.fn(),
  uploadAnticheatEvidenceObject: vi.fn(),
}))

import { getMonitoredConsentAction } from '@/app/actions/anticheat'

beforeEach(() => {
  findFirst.mockReset()
  getSessionUser.mockReset()
  getSessionUser.mockResolvedValue({
    id: 'student-1',
    role: 'student',
    email: 's@example.com',
    fullName: 'Student',
  })
})

describe('getMonitoredConsentAction', () => {
  it('reads consent for this student in-progress submission only', async () => {
    findFirst.mockResolvedValue({
      id: 'sub-1',
      anticheatConsent: { outcome: 'granted' },
    })

    const result = await getMonitoredConsentAction({ testId: 'test-1' })

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        testId: 'test-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
      },
      orderBy: { attemptNumber: 'desc' },
      select: {
        id: true,
        anticheatConsent: { select: { outcome: true } },
      },
    })
    expect(result).toEqual({
      success: true,
      data: { submissionId: 'sub-1', outcome: 'granted' },
    })
  })

  it('does not treat a submission without a consent row as granted', async () => {
    findFirst.mockResolvedValue({ id: 'sub-1', anticheatConsent: null })

    const result = await getMonitoredConsentAction({ testId: 'test-1' })

    expect(result).toEqual({
      success: true,
      data: { submissionId: 'sub-1', outcome: null },
    })
  })
})
