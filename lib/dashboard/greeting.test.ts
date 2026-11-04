import { describe, expect, it } from 'vitest'
import { formatStudentGreeting, getTimeOfDayGreeting } from '@/lib/dashboard/greeting'

describe('getTimeOfDayGreeting', () => {
  it('uses Asia/Ho_Chi_Minh, not the runtime local zone', () => {
    // 2026-06-15 04:30 UTC = 11:30 VN → morning; 05:30 UTC = 12:30 VN → afternoon
    expect(getTimeOfDayGreeting(new Date('2026-06-15T04:30:00.000Z'))).toBe(
      'Chào buổi sáng',
    )
    expect(getTimeOfDayGreeting(new Date('2026-06-15T05:30:00.000Z'))).toBe(
      'Chào buổi chiều',
    )
    expect(getTimeOfDayGreeting(new Date('2026-06-15T12:00:00.000Z'))).toBe(
      'Chào buổi tối',
    )
  })

  it('formats the header string', () => {
    expect(
      formatStudentGreeting('Nguyễn', new Date('2026-06-15T04:30:00.000Z')),
    ).toBe('Chào buổi sáng, Nguyễn!')
  })
})
