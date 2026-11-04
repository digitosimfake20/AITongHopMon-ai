import { describe, expect, it } from 'vitest'
import {
  buildBehaviorSignals,
  buildTopicMasteryFromBkt,
  buildTopicMasteryFromSubmissions,
} from '@/lib/quiz/teacher-student-queries'

describe('buildBehaviorSignals', () => {
  const empty = {
    fast_wrong: 0,
    slow_wrong: 0,
    correct_fast: 0,
    correct_steady: 0,
  }

  it('returns no signals below thresholds', () => {
    expect(
      buildBehaviorSignals({
        ...empty,
        fast_wrong: 1,
        slow_wrong: 1,
        correct_fast: 2,
      }),
    ).toEqual([])
  })

  it('emits CARELESS when fast_wrong ≥ 2', () => {
    const signals = buildBehaviorSignals({ ...empty, fast_wrong: 2 })
    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({ type: 'CARELESS', count: 2 })
  })

  it('emits STUCK when slow_wrong ≥ 2', () => {
    const signals = buildBehaviorSignals({ ...empty, slow_wrong: 3 })
    expect(signals[0]).toMatchObject({ type: 'STUCK', count: 3 })
  })

  it('emits CONFIDENT when correct_fast ≥ 3', () => {
    const signals = buildBehaviorSignals({ ...empty, correct_fast: 3 })
    expect(signals[0]).toMatchObject({ type: 'CONFIDENT', count: 3 })
  })

  it('emits STEADY for any correct_steady > 0', () => {
    const signals = buildBehaviorSignals({ ...empty, correct_steady: 1 })
    expect(signals[0]).toMatchObject({ type: 'STEADY', count: 1 })
  })

  it('can stack multiple signal types', () => {
    const types = buildBehaviorSignals({
      fast_wrong: 2,
      slow_wrong: 2,
      correct_fast: 3,
      correct_steady: 4,
    }).map((s) => s.type)
    expect(types).toEqual(['CARELESS', 'STUCK', 'CONFIDENT', 'STEADY'])
  })
})

describe('buildTopicMasteryFromSubmissions', () => {
  it('computes accuracy and sorts weak first', () => {
    const rows = buildTopicMasteryFromSubmissions([
      { topic: 'Strong', total: 10, correct: 9 },
      { topic: 'Weak', total: 10, correct: 2 },
      { topic: 'Empty', total: 0, correct: 0 },
    ])
    expect(rows.map((r) => r.topic)).toEqual(['Empty', 'Weak', 'Strong'])
    expect(rows[1]).toMatchObject({
      topic: 'Weak',
      accuracy: 20,
      source: 'submission',
    })
    expect(rows[0]).toMatchObject({ accuracy: 0, source: 'submission' })
  })
})

describe('buildTopicMasteryFromBkt', () => {
  it('maps pMastery to percent accuracy and sorts ascending', () => {
    const rows = buildTopicMasteryFromBkt([
      { nodeId: 'n2', pMastery: 0.9, node: { title: 'High' } },
      { nodeId: 'n1', pMastery: 0.4, node: { title: 'Low' } },
    ])
    expect(rows).toEqual([
      expect.objectContaining({
        topic: 'Low',
        topicKey: 'n1',
        accuracy: 40,
        pMastery: 0.4,
        source: 'bkt',
      }),
      expect.objectContaining({
        topic: 'High',
        topicKey: 'n2',
        accuracy: 90,
        source: 'bkt',
      }),
    ])
  })
})
