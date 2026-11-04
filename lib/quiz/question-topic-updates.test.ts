import { describe, expect, it } from 'vitest'
import { filterTopicUpdates } from '@/lib/quiz/question-topic-updates'

describe('filterTopicUpdates', () => {
  it('drops a question id that is not on this submission', () => {
    const allowed = '11111111-1111-4111-8111-111111111111'
    const foreign = '22222222-2222-4222-8222-222222222222'
    const updates = [
      { id: allowed, topic: 'Phép nhân phân thức', topicKey: 'phep-nhan-phan-thuc' },
      { id: foreign, topic: 'Chủ đề lạ', topicKey: 'chu-e-la' },
    ]

    expect(filterTopicUpdates(updates, new Set([allowed]))).toEqual([updates[0]])
  })
})
