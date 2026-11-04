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
})
