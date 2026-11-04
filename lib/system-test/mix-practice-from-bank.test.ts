import { describe, expect, it } from 'vitest'
import {
  buildPracticeTopicNeedles,
  topicMatches,
} from '@/lib/system-test/mix-practice-from-bank'

describe('buildPracticeTopicNeedles', () => {
  it('includes lowercased titles and topicKeys', () => {
    const needles = buildPracticeTopicNeedles(['Phép nhân phân thức'], ['phep-nhan-phan-thuc'])
    expect(needles).toContain('phép nhân phân thức')
    expect(needles).toContain('phep-nhan-phan-thuc')
  })
})

describe('topicMatches', () => {
  it('matches by normalized slug equality', () => {
    expect(topicMatches('Phép nhân phân thức', ['phep nhan phan thuc'])).toBe(true)
  })

  it('rejects unrelated topics', () => {
    expect(topicMatches('Hình học', ['Đại số'])).toBe(false)
  })
})
