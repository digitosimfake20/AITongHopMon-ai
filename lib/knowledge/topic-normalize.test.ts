import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOPIC,
  mergeByTopicKey,
  normalizeTopicName,
  pickCanonicalTopicLabel,
  resolveTopicKey,
  topicToNodeId,
} from '@/lib/knowledge/topic-normalize'

describe('normalizeTopicName', () => {
  it('collapses whitespace and falls back for empty/null', () => {
    expect(normalizeTopicName(null)).toBe(DEFAULT_TOPIC)
    expect(normalizeTopicName(undefined)).toBe(DEFAULT_TOPIC)
    expect(normalizeTopicName('')).toBe(DEFAULT_TOPIC)
    expect(normalizeTopicName('   ')).toBe(DEFAULT_TOPIC)
    expect(normalizeTopicName('  Phân  thức   đại số  ')).toBe('Phân thức đại số')
  })

  it('preserves Vietnamese casing', () => {
    expect(normalizeTopicName('Hình Học')).toBe('Hình Học')
  })
})

describe('topicToNodeId', () => {
  it('slugifies with diacritic strip for short labels', () => {
    // `đ` is not NFD-decomposed to `d`, so it is dropped by the [a-z0-9] filter
    expect(topicToNodeId('Phân thức đại số')).toBe('phan-thuc-ai-so')
    expect(topicToNodeId('Phương trình')).toBe('phuong-trinh')
    // DEFAULT_TOPIC "Chủ đề khác" → đ dropped → chu-e-khac (empty-slug fallback unused)
    expect(topicToNodeId('')).toBe('chu-e-khac')
  })

  it('hashes long labels by full normalized text + subject (no 64-char truncate collide)', () => {
    const prefix = 'chu-de-rat-dai-' + 'x'.repeat(80)
    const a = `${prefix}-bien-a`
    const b = `${prefix}-bien-b`
    const idA = topicToNodeId(a, 'Toán')
    const idB = topicToNodeId(b, 'Toán')
    expect(idA).toMatch(/^t_[a-f0-9]{32}$/)
    expect(idB).toMatch(/^t_[a-f0-9]{32}$/)
    expect(idA).not.toBe(idB)
    expect(topicToNodeId(a, 'Toán')).toBe(idA)
    expect(topicToNodeId(a, 'Vật lý')).not.toBe(idA)
  })

  it('is stable across casing for the same Vietnamese topic', () => {
    expect(topicToNodeId('Phương trình')).toBe(topicToNodeId('phương trình'))
  })
})

describe('resolveTopicKey', () => {
  it('returns display name + node id', () => {
    expect(resolveTopicKey('  Tam giác  ')).toEqual({
      topicName: 'Tam giác',
      topicKey: 'tam-giac',
    })
  })
})

describe('pickCanonicalTopicLabel', () => {
  it('picks majority label, then localeCompare tie-break', () => {
    expect(pickCanonicalTopicLabel([])).toBe(DEFAULT_TOPIC)
    expect(pickCanonicalTopicLabel(['A', 'B', 'A'])).toBe('A')
    // same counts → lexicographic (vi)
    expect(pickCanonicalTopicLabel(['Beta', 'Alpha'])).toBe('Alpha')
  })
})

describe('mergeByTopicKey', () => {
  it('merges rows that normalize to the same key', () => {
    const merged = mergeByTopicKey(
      [
        { topic: 'Phân thức', count: 1 },
        { topic: '  phân thức  ', count: 2 },
        { topic: 'Hình học', count: 3 },
      ],
      (a, b) => ({ ...a, count: a.count + b.count }),
    )
    expect(merged).toHaveLength(2)
    const phan = merged.find((r) => r.topicKey === 'phan-thuc')!
    expect(phan.count).toBe(3)
    expect(phan.topicName).toBeTruthy()
  })
})
