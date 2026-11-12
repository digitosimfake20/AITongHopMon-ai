import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '@/lib/auth/types'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  rosterFindFirst: vi.fn(),
  memberCount: vi.fn(),
  memberFindUnique: vi.fn(),
  updateMany: vi.fn(),
  memberUpsert: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/cache/invalidate', () => ({
  invalidateAfterRoster: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    classRosterEntry: { findFirst: mocks.rosterFindFirst },
    classMember: {
      count: mocks.memberCount,
      findUnique: mocks.memberFindUnique,
    },
    $transaction: async (fn: (tx: {
      classRosterEntry: { updateMany: typeof mocks.updateMany }
      classMember: { upsert: typeof mocks.memberUpsert }
    }) => Promise<unknown>) =>
      fn({
        classRosterEntry: { updateMany: mocks.updateMany },
        classMember: { upsert: mocks.memberUpsert },
      }),
  },
}))

import { claimRosterNameAction } from '@/app/actions/roster'

const student: SessionUser = {
  id: 'student-1',
  email: 's@example.com',
  fullName: 'Hoc Sinh',
  role: 'student',
}

const freeEntry = {
  id: 'roster-1',
  classId: 'class-1',
  linkedUserId: null as string | null,
  class: { name: '10A1', maxCapacity: 30 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSessionUser.mockResolvedValue(student)
  mocks.rosterFindFirst.mockImplementation(async (args: { where: { linkedUserId?: string } }) => {
    if (args.where.linkedUserId) return null
    return freeEntry
  })
  mocks.memberCount.mockResolvedValue(0)
  mocks.memberFindUnique.mockResolvedValue(null)
  mocks.updateMany.mockResolvedValue({ count: 1 })
  mocks.memberUpsert.mockResolvedValue({})
})

describe('claimRosterNameAction', () => {
  it('rejects a double-claim when the roster row is no longer unlinked', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    const result = await claimRosterNameAction({ rosterId: 'roster-1', classId: 'class-1' })

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'roster-1', classId: 'class-1', linkedUserId: null },
      data: { linkedUserId: 'student-1' },
    })
    expect(result).toEqual({
      success: false,
      error: 'Tên này đã được bạn khác chọn. Hãy chọn tên của bạn.',
    })
    expect(mocks.memberUpsert).not.toHaveBeenCalled()
  })

  it('rejects a new member when the class is at max capacity', async () => {
    mocks.memberCount.mockResolvedValue(freeEntry.class.maxCapacity)

    const result = await claimRosterNameAction({ rosterId: 'roster-1', classId: 'class-1' })

    expect(result).toEqual({ success: false, error: 'Lớp đã đủ sĩ số' })
    expect(mocks.memberUpsert).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('still links a name when the student is already in a full class', async () => {
    mocks.memberCount.mockResolvedValue(freeEntry.class.maxCapacity)
    mocks.memberFindUnique.mockResolvedValue({ id: 'member-1' })

    const result = await claimRosterNameAction({ rosterId: 'roster-1', classId: 'class-1' })

    expect(result.success).toBe(true)
    expect(mocks.updateMany).toHaveBeenCalled()
    expect(mocks.memberUpsert).toHaveBeenCalled()
  })

  it('links an unclaimed name when the class has room', async () => {
    const result = await claimRosterNameAction({ rosterId: 'roster-1', classId: 'class-1' })

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'roster-1', classId: 'class-1', linkedUserId: null },
      data: { linkedUserId: 'student-1' },
    })
    expect(mocks.memberUpsert).toHaveBeenCalledWith({
      where: { classId_studentId: { classId: 'class-1', studentId: 'student-1' } },
      create: { classId: 'class-1', studentId: 'student-1' },
      update: {},
    })
    expect(result).toEqual({
      success: true,
      data: { classId: 'class-1', className: '10A1' },
    })
  })
})
