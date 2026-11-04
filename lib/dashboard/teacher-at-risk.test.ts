import { describe, expect, it } from 'vitest'
import { pickAtRiskStudents } from '@/lib/dashboard/teacher-at-risk'

describe('pickAtRiskStudents', () => {
  it('keeps lowest averages under threshold, capped at limit', () => {
    expect(
      pickAtRiskStudents([
        { studentId: 'a', avgScore: 4.2 },
        { studentId: 'b', avgScore: 7.0 },
        { studentId: 'c', avgScore: 3.1 },
        { studentId: 'd', avgScore: 4.9 },
        { studentId: 'e', avgScore: 2.0 },
      ]),
    ).toEqual([
      { studentId: 'e', avgScore: 2.0 },
      { studentId: 'c', avgScore: 3.1 },
      { studentId: 'a', avgScore: 4.2 },
    ])
  })

  it('drops non-finite scores', () => {
    expect(
      pickAtRiskStudents([{ studentId: 'x', avgScore: Number.NaN }]),
    ).toEqual([])
  })
})
