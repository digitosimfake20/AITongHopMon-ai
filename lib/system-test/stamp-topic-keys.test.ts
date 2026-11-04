import { describe, expect, it } from 'vitest'
import { stampQuestionTopicKeys } from '@/lib/system-test/stamp-topic-keys'

describe('stampQuestionTopicKeys', () => {
  it('stamps normalized topic + topicKey from question topic', () => {
    const out = stampQuestionTopicKeys([
      { type: 'MULTIPLE_CHOICE', content: '1+1?', topic: '  Phép cộng  ' },
    ])
    expect(out[0]?.topic).toBe('Phép cộng')
    expect(out[0]?.topicKey).toBe('phep-cong')
  })

  it('falls back to group/title topic when question topic missing', () => {
    const out = stampQuestionTopicKeys(
      [{ type: 'MULTIPLE_CHOICE', content: 'x?' }],
      'Phân thức',
    )
    expect(out[0]?.topic).toBe('Phân thức')
    expect(out[0]?.topicKey).toBe('phan-thuc')
  })
})
