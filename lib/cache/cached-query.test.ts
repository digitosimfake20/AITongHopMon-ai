import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn(),
  updateTag: mocks.updateTag,
  revalidateTag: vi.fn(),
}))

import {
  bustAfterMastery,
  bustAfterSubmit,
} from '@/lib/cache/cached-query'
import { CacheTags } from '@/lib/cache/tags'

beforeEach(() => {
  mocks.updateTag.mockClear()
})

function bustedTags(): string[] {
  return mocks.updateTag.mock.calls.map((c) => c[0] as string)
}

describe('bustAfterSubmit', () => {
  it('busts score/bank tags but not knowledge or studentDash', () => {
    bustAfterSubmit('class-1', 'student-1')

    const tags = bustedTags()
    expect(tags).toEqual(
      expect.arrayContaining([
        CacheTags.submissions('class-1'),
        CacheTags.adaptive('class-1'),
        CacheTags.quizBank('class-1'),
        CacheTags.quizBankStudent('class-1', 'student-1'),
      ]),
    )
    expect(tags).not.toContain(CacheTags.knowledge('student-1'))
    expect(tags).not.toContain(CacheTags.studentDash('student-1'))
  })
})

describe('bustAfterMastery', () => {
  it('busts knowledge and studentDash after BKT upserts', () => {
    bustAfterMastery('student-1')

    expect(bustedTags()).toEqual([
      CacheTags.studentDash('student-1'),
      CacheTags.knowledge('student-1'),
    ])
  })
})

describe('submit cache bust order', () => {
  it('mastery tags are busted only after the pipeline callback finishes', async () => {
    const order: string[] = []
    const pipeline = vi.fn(async () => {
      order.push('pipeline')
    })

    bustAfterSubmit('class-1', 'student-1')
    order.push('scores')
    await pipeline()
    bustAfterMastery('student-1')
    order.push('mastery')

    expect(order).toEqual(['scores', 'pipeline', 'mastery'])
    expect(pipeline).toHaveBeenCalledOnce()
    const scoresIdx = bustedTags().indexOf(CacheTags.quizBank('class-1'))
    const masteryIdx = bustedTags().indexOf(CacheTags.knowledge('student-1'))
    expect(scoresIdx).toBeGreaterThanOrEqual(0)
    expect(masteryIdx).toBeGreaterThan(scoresIdx)
  })
})
