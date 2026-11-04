import { describe, expect, it } from 'vitest'
import { aliasesForInput } from '@/lib/knowledge/topic-canonicalize-ai'
import { topicToNodeId } from '@/lib/knowledge/topic-normalize'

describe('aliasesForInput', () => {
  const inputLabels = ['Phép trừ phân thức', 'Cộng phân thức']

  it('drops a variant that was not in the input list', () => {
    const aliases = aliasesForInput(
      [
        {
          canonicalLabel: 'Cộng trừ phân thức',
          variants: [
            'Cộng trừ phân thức',
            'Phép trừ phân thức',
            'Cộng phân thức',
            'Nhãn ngoài danh sách',
          ],
        },
      ],
      inputLabels,
    )

    const keys = aliases.map((alias) => alias.aliasKey)
    expect(keys).not.toContain('Nhãn ngoài danh sách')
    expect(keys).not.toContain('Cộng trừ phân thức')
    expect(keys).toEqual(expect.arrayContaining(inputLabels))
    expect(keys).toHaveLength(inputLabels.length)
    for (const key of keys) {
      expect(inputLabels).toContain(key)
    }
    expect(aliases.every((alias) => alias.canonicalLabel === 'Cộng trừ phân thức')).toBe(true)
    expect(aliases.every((alias) => alias.canonicalKey === topicToNodeId('Cộng trừ phân thức'))).toBe(
      true,
    )
  })

  it('does not invent aliases from a failed or empty group list', () => {
    expect(aliasesForInput([], inputLabels)).toEqual([])
    expect(aliasesForInput(null, inputLabels)).toEqual([])
    expect(
      aliasesForInput(
        [{ canonicalLabel: 'Tên chuẩn lạ', variants: ['Tên chuẩn lạ'] }],
        inputLabels,
      ),
    ).toEqual([])
  })

  it('keeps only alias keys that are input labels', () => {
    const aliases = aliasesForInput(
      [
        {
          canonicalLabel: 'Phép trừ phân thức',
          variants: ['Phép trừ phân thức', 'Không có trong input'],
        },
        {
          canonicalLabel: 'Nhóm khác',
          variants: ['Cộng phân thức'],
        },
      ],
      inputLabels,
    )

    expect(aliases.map((alias) => alias.aliasKey)).toEqual(inputLabels)
    for (const alias of aliases) {
      expect(inputLabels).toContain(alias.aliasKey)
    }
  })
})
