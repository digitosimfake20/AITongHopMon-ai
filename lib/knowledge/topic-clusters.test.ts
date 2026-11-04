import { describe, expect, it } from 'vitest'
import {
  getTopicClusterDef,
  inferTopicCluster,
  masteryStatusFromPercent,
  masteryStatusLabel,
} from '@/lib/knowledge/topic-clusters'

describe('inferTopicCluster', () => {
  it('classifies algebra / geometry / numbers / stats keywords', () => {
    expect(inferTopicCluster('Phương trình bậc nhất')).toBe('algebra')
    expect(inferTopicCluster('Diện tích tam giác')).toBe('geometry')
    expect(inferTopicCluster('Số nguyên và lũy thừa')).toBe('numbers')
    expect(inferTopicCluster('Xác suất và biểu đồ')).toBe('stats')
  })

  it('falls back to other when no keyword matches', () => {
    expect(inferTopicCluster('Chủ đề lạ xyz')).toBe('other')
  })
})

describe('getTopicClusterDef', () => {
  it('returns known cluster or other fallback', () => {
    expect(getTopicClusterDef('algebra').label).toBe('Đại số')
    expect(getTopicClusterDef('missing').id).toBe('other')
  })
})

describe('masteryStatusFromPercent / masteryStatusLabel', () => {
  it('maps percent to MASTERED / PROGRESSING / GAP with VI labels', () => {
    expect(masteryStatusFromPercent(90)).toBe('MASTERED')
    expect(masteryStatusFromPercent(70)).toBe('PROGRESSING')
    expect(masteryStatusFromPercent(40)).toBe('GAP')
    expect(masteryStatusLabel('MASTERED')).toBe('Tốt')
    expect(masteryStatusLabel('PROGRESSING')).toBe('Khá')
    expect(masteryStatusLabel('GAP')).toBe('Lỗ hổng lớn')
  })
})
