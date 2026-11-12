import { describe, expect, it } from 'vitest'
import {
  gapWrongPercent,
  inferGrade,
  pickNeedsSupportRemedialTopic,
  studentTierFromAvg,
  tierGroupPercent,
} from '@/lib/quiz/class-gap-map'

describe('inferGrade', () => {
  it('parses single-digit grades 6–9', () => {
    expect(inferGrade('9A2')).toBe('9')
    expect(inferGrade('Lớp 8B')).toBe('8')
    expect(inferGrade('7C1 Toán')).toBe('7')
  })

  it('parses grades 10–12', () => {
    expect(inferGrade('10A')).toBe('10')
    expect(inferGrade('11B2')).toBe('11')
    expect(inferGrade('12C')).toBe('12')
  })

  it('defaults to 8 when no grade token matches', () => {
    expect(inferGrade('Toán nâng cao')).toBe('8')
    expect(inferGrade('')).toBe('8')
    expect(inferGrade('5A')).toBe('8')
  })
})

describe('studentTierFromAvg', () => {
  it('excellent at and above 8.5', () => {
    expect(studentTierFromAvg(8.5)).toBe('excellent')
    expect(studentTierFromAvg(10)).toBe('excellent')
  })

  it('good from 5 inclusive up to below 8.5', () => {
    expect(studentTierFromAvg(5)).toBe('good')
    expect(studentTierFromAvg(8.49)).toBe('good')
  })

  it('needsSupport below 5', () => {
    expect(studentTierFromAvg(4.99)).toBe('needsSupport')
    expect(studentTierFromAvg(0)).toBe('needsSupport')
  })
})

describe('gapWrongPercent', () => {
  it('returns one-decimal percent of class affected', () => {
    expect(gapWrongPercent(1, 3)).toBe(33.3)
    expect(gapWrongPercent(2, 4)).toBe(50)
  })

  it('returns 0 when class is empty', () => {
    expect(gapWrongPercent(5, 0)).toBe(0)
  })

  it('can exceed 100 when counts are inconsistent', () => {
    expect(gapWrongPercent(5, 2)).toBe(250)
  })
})

describe('tierGroupPercent', () => {
  it('rounds share of class', () => {
    expect(tierGroupPercent(1, 3)).toBe(33)
    expect(tierGroupPercent(2, 3)).toBe(67)
  })

  it('returns 0 when studentCount is 0', () => {
    expect(tierGroupPercent(2, 0)).toBe(0)
  })
})

describe('pickNeedsSupportRemedialTopic', () => {
  it('picks weakest GAP topic from topicMastery, not a strong topic', () => {
    const topic = pickNeedsSupportRemedialTopic({
      topicMastery: [
        { topic: 'Phương trình bậc nhất', status: 'MASTERED', masteryPercent: 92 },
        { topic: 'Phân số', status: 'GAP', masteryPercent: 28 },
        { topic: 'Hình học', status: 'GAP', masteryPercent: 15 },
        { topic: 'Tỉ lệ', status: 'PROGRESSING', masteryPercent: 60 },
      ],
      criticalGaps: [{ topic: 'Phân thức đại số', wrongPercent: 80 }],
    })
    expect(topic).toBe('Hình học')
    expect(topic).not.toBe('Phương trình bậc nhất')
    expect(topic).not.toBe('Phân thức đại số')
  })

  it('falls back to highest-wrong critical gap when no GAP mastery rows', () => {
    const topic = pickNeedsSupportRemedialTopic({
      topicMastery: [
        { topic: 'Phương trình bậc nhất', status: 'MASTERED', masteryPercent: 90 },
      ],
      criticalGaps: [
        { topic: 'Căn bậc hai', wrongPercent: 45 },
        { topic: 'Bất phương trình', wrongPercent: 72 },
      ],
    })
    expect(topic).toBe('Bất phương trình')
  })

  it('returns null when neither GAP nor critical topics exist', () => {
    expect(
      pickNeedsSupportRemedialTopic({
        topicMastery: [
          { topic: 'Phương trình bậc nhất', status: 'MASTERED', masteryPercent: 90 },
        ],
        criticalGaps: [],
      }),
    ).toBeNull()
  })
})
