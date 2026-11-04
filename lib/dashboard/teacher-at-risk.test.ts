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

  it('returns empty for empty input', () => {
    expect(pickAtRiskStudents([])).toEqual([])
  })

  it('excludes scores at or above default threshold (5)', () => {
    expect(
      pickAtRiskStudents([
        { studentId: 'boundary', avgScore: 5 },
        { studentId: 'ok', avgScore: 5.01 },
        { studentId: 'risk', avgScore: 4.99 },
      ]),
    ).toEqual([{ studentId: 'risk', avgScore: 4.99 }])
  })

  it('honors custom limit and threshold', () => {
    expect(
      pickAtRiskStudents(
        [
          { studentId: 'a', avgScore: 1 },
          { studentId: 'b', avgScore: 2 },
          { studentId: 'c', avgScore: 3 },
          { studentId: 'd', avgScore: 6 },
        ],
        2,
        4,
      ),
    ).toEqual([
      { studentId: 'a', avgScore: 1 },
      { studentId: 'b', avgScore: 2 },
    ])
  })

  it('drops Infinity and -Infinity', () => {
    expect(
      pickAtRiskStudents([
        { studentId: 'pos', avgScore: Number.POSITIVE_INFINITY },
        { studentId: 'neg', avgScore: Number.NEGATIVE_INFINITY },
        { studentId: 'ok', avgScore: 0 },
      ]),
    ).toEqual([{ studentId: 'ok', avgScore: 0 }])
  })

  it('includes zero avgScore as at-risk under default threshold', () => {
    expect(pickAtRiskStudents([{ studentId: 'z', avgScore: 0 }], 3, 5)).toEqual([
      { studentId: 'z', avgScore: 0 },
    ])
  })

  it('limit 0 yields empty even when rows qualify', () => {
    expect(pickAtRiskStudents([{ studentId: 'a', avgScore: 1 }], 0)).toEqual([])
  })
})
