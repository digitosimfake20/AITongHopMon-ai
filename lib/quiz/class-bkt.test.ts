import { describe, expect, it } from 'vitest'
import { filterBktToClassNodes } from '@/lib/quiz/class-bkt'

describe('filterBktToClassNodes', () => {
  const inClass = { nodeId: 'algebra', pMastery: 0.4 }
  const outside = { nodeId: 'geometry', pMastery: 0.9 }

  it('keeps a node that is in the class set', () => {
    expect(filterBktToClassNodes([inClass, outside], new Set(['algebra']))).toEqual([inClass])
  })

  it('drops a node that is outside the class set', () => {
    expect(filterBktToClassNodes([outside], new Set(['algebra']))).toEqual([])
  })

  it('drops every state when the class set is empty', () => {
    expect(filterBktToClassNodes([inClass, outside], new Set())).toEqual([])
  })
})
