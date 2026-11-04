import { describe, expect, it } from 'vitest'
import {
  isWeakMastery,
  mapWeakTopics,
  masteryPercentFromAvg,
  studyHoursFromSeconds,
} from '@/lib/dashboard/student-dashboard-metrics'

describe('student-dashboard-metrics', () => {
  it('maps average mastery to percent and handles empty', () => {
    expect(masteryPercentFromAvg(0.85, 4)).toBe(85)
    expect(masteryPercentFromAvg(null, 0)).toBe(0)
    expect(masteryPercentFromAvg(0.5, 0)).toBe(0)
  })

  it('rounds study hours to one decimal', () => {
    expect(studyHoursFromSeconds(3600)).toBe(1)
    expect(studyHoursFromSeconds(5400)).toBe(1.5)
    expect(studyHoursFromSeconds(0)).toBe(0)
  })

  it('maps weak topics with severity bands', () => {
    const topics = mapWeakTopics([
      { nodeId: 'a', pMastery: 0.3, node: { title: 'Hệ PT' } },
      { nodeId: 'b', pMastery: 0.7, node: { title: 'Hằng đẳng thức' } },
    ])
    expect(topics).toEqual([
      { id: 'a', label: 'Hệ PT', accuracy: 30, severity: 'weak' },
      { id: 'b', label: 'Hằng đẳng thức', accuracy: 70, severity: 'moderate' },
    ])
    expect(isWeakMastery(0.84)).toBe(true)
    expect(isWeakMastery(0.85)).toBe(false)
  })

  it('respects weak-topic limit and coerces string pMastery', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      nodeId: `n${i}`,
      pMastery: '0.2',
      node: { title: `T${i}` },
    }))
    expect(mapWeakTopics(rows, 3)).toHaveLength(3)
    expect(mapWeakTopics(rows, 3)[0]).toMatchObject({ accuracy: 20, severity: 'weak' })
  })

  it('treats undefined avg as 0 percent', () => {
    expect(masteryPercentFromAvg(undefined, 3)).toBe(0)
    expect(masteryPercentFromAvg(0.856, 1)).toBe(86)
  })
})
