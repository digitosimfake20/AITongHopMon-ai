import { describe, expect, it } from 'vitest'
import { topicMatches } from '@/lib/system-test/mix-practice-from-bank'

describe('topicMatches', () => {
  it('matches exact normalized topic keys', () => {
    expect(topicMatches('Phân thức đại số', ['phân thức đại số'])).toBe(true)
    expect(topicMatches('Hình học', ['Đại số'])).toBe(false)
  })

  it('matches when one key contains the other', () => {
    expect(topicMatches('Phương trình bậc nhất một ẩn', ['phuong-trinh'])).toBe(true)
  })

  it('matches case-insensitive display substring', () => {
    expect(topicMatches('Ôn tập Phương trình', ['phương trình'])).toBe(true)
  })
})
