import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {},
}))

import { assembleZenoPrompt } from '@/lib/ai/build-zeno-memory'
import {
  CHAT_MESSAGE_TOO_LONG_ERROR,
  MAX_CHAT_MESSAGE_CHARS,
  chatMessageLengthError,
  isChatMessageTooLong,
  isChatSessionId,
} from '@/lib/ai/chat-limits'

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('isChatSessionId', () => {
  it('accepts a canonical UUID', () => {
    expect(isChatSessionId(SESSION_ID)).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    expect(isChatSessionId('not-a-uuid')).toBe(false)
  })

  it('rejects a plain object', () => {
    expect(isChatSessionId({ id: SESSION_ID })).toBe(false)
    expect(isChatSessionId(7)).toBe(false)
  })
})

describe('chat message length', () => {
  it('returns the fixed error when the trimmed message exceeds 2000 characters', () => {
    expect(MAX_CHAT_MESSAGE_CHARS).toBe(2000)
    expect(isChatMessageTooLong('a'.repeat(2000))).toBe(false)
    expect(isChatMessageTooLong(`  ${'a'.repeat(2000)}  `)).toBe(false)
    expect(isChatMessageTooLong('a'.repeat(2001))).toBe(true)
    expect(chatMessageLengthError('a'.repeat(2001))).toBe(CHAT_MESSAGE_TOO_LONG_ERROR)
    expect(chatMessageLengthError('a'.repeat(2000))).toBeNull()
    expect(CHAT_MESSAGE_TOO_LONG_ERROR).toBe('Tin nhắn không được dài quá 2000 ký tự')
  })
})

describe('assembleZenoPrompt', () => {
  it('keeps model memory out of the system text and truncates it in the data message', () => {
    const encouragement = `ENCOURAGE_${'E'.repeat(220)}`
    const summary = `SUMMARY_${'S'.repeat(220)}`
    const chunk = `CHUNK_${'C'.repeat(220)}`

    const { system, untrustedData } = assembleZenoPrompt({
      studentName: 'Học sinh Mai',
      personaHint: 'PEDAGOGY_KEEP_9c2',
      profileSection: '- Persona: Thành thạo',
      curatedInsight: encouragement,
      longTermSummary: summary,
      chunkSummaries: [chunk],
    })

    expect(system).toContain('Học sinh Mai')
    expect(system).toContain('PEDAGOGY_KEEP_9c2')
    expect(system).toContain('1. Tham chiếu')
    expect(system).not.toContain('ENCOURAGE_')
    expect(system).not.toContain('SUMMARY_')
    expect(system).not.toContain('CHUNK_')
    expect(system).not.toMatch(/untrusted/i)

    expect(untrustedData).toMatch(/untrusted/i)
    expect(untrustedData).toContain(encouragement.slice(0, 200))
    expect(untrustedData).not.toContain(encouragement.slice(0, 201))
    expect(untrustedData).toContain(summary.slice(0, 200))
    expect(untrustedData).not.toContain(summary.slice(0, 201))
    expect(untrustedData).toContain(chunk.slice(0, 200))
    expect(untrustedData).not.toContain(chunk.slice(0, 201))
  })

  it('omits the data message when model fields are blank', () => {
    const { system, untrustedData } = assembleZenoPrompt({
      studentName: 'An',
      personaHint: 'hint',
      profileSection: '- Persona: x',
      curatedInsight: '   ',
      longTermSummary: '',
      chunkSummaries: ['  '],
    })

    expect(untrustedData).toBeNull()
    expect(system).toContain('An')
    expect(system).not.toMatch(/untrusted/i)
  })
})
