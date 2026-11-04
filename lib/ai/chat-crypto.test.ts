import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessageAad } from '@/lib/ai/chat-crypto'
import { decryptMessage, encryptMessage } from '@/lib/ai/chat-crypto'

const PREV_KEY = process.env.CHAT_ENCRYPTION_KEY
const ZERO_IV = '000000000000000000000000'

const aad: ChatMessageAad = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  studentId: '22222222-2222-4222-8222-222222222222',
  sequenceNumber: 3,
  sender: 'user',
}

function zeroIvPayload(plaintext: string) {
  return {
    encryptedContent: Buffer.from(plaintext, 'utf8').toString('base64'),
    iv: ZERO_IV,
    authTag: '00000000000000000000000000000000',
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  if (PREV_KEY === undefined) {
    delete process.env.CHAT_ENCRYPTION_KEY
  } else {
    process.env.CHAT_ENCRYPTION_KEY = PREV_KEY
  }
})

describe('chat-crypto (AES round-trip)', () => {
  it('encrypts and decrypts with a 32-byte hex key', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'a'.repeat(64)
    const plaintext = 'Xin chào — công thức $x^2$'
    const payload = encryptMessage(plaintext, aad)
    expect(payload.iv).not.toBe(ZERO_IV)
    expect(payload.encryptedContent).not.toContain(plaintext)
    expect(decryptMessage(payload, aad)).toBe(plaintext)
  })

  it('uses distinct IVs per encryption', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'b'.repeat(64)
    const first = encryptMessage('same', aad)
    const second = encryptMessage('same', aad)
    expect(first.iv).not.toBe(second.iv)
    expect(first.encryptedContent).not.toBe(second.encryptedContent)
  })

  it('rejects a payload decrypted with a different binding', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'c'.repeat(64)
    const payload = encryptMessage('bound', aad)
    expect(decryptMessage(payload, aad)).toBe('bound')
    expect(() =>
      decryptMessage(payload, {
        ...aad,
        sessionId: '33333333-3333-4333-8333-333333333333',
      }),
    ).toThrow()
    expect(() =>
      decryptMessage(payload, {
        ...aad,
        studentId: '44444444-4444-4444-8444-444444444444',
      }),
    ).toThrow()
    expect(() =>
      decryptMessage(payload, { ...aad, sequenceNumber: aad.sequenceNumber + 1 }),
    ).toThrow()
    expect(() => decryptMessage(payload, { ...aad, sender: 'assistant' })).toThrow()
  })
})

describe('chat-crypto (key material)', () => {
  it('does not treat a 64-character non-hex string as a key', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'z'.repeat(64)
    const payload = encryptMessage('hello', aad)
    expect(payload.iv).toBe(ZERO_IV)
    expect(payload.encryptedContent).toBe(Buffer.from('hello', 'utf8').toString('base64'))
    expect(decryptMessage(payload, aad)).toBe('hello')

    vi.stubEnv('NODE_ENV', 'production')
    expect(() => encryptMessage('hello', aad)).toThrow()
  })
})

describe('chat-crypto (fail closed)', () => {
  it('throws in production when the key is missing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.CHAT_ENCRYPTION_KEY
    expect(() => encryptMessage('secret', aad)).toThrow()
  })

  it('throws in production when the IV is zero', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const payload = zeroIvPayload('SHOULD_NOT_LEAK')
    process.env.CHAT_ENCRYPTION_KEY = 'd'.repeat(64)
    expect(() => decryptMessage(payload, aad)).toThrow()
    delete process.env.CHAT_ENCRYPTION_KEY
    expect(() => decryptMessage(payload, aad)).toThrow()
  })

  it('throws when a 32-byte key is set and the IV is zero', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'e'.repeat(64)
    const payload = zeroIvPayload('SHOULD_NOT_LEAK')
    expect(() => decryptMessage(payload, aad)).toThrow()
  })
})

describe('chat-crypto (dev fallback)', () => {
  it('round-trips via base64 when key is missing', () => {
    delete process.env.CHAT_ENCRYPTION_KEY
    const payload = encryptMessage('dev mode text', aad)
    expect(payload.iv).toBe(ZERO_IV)
    expect(decryptMessage(payload, aad)).toBe('dev mode text')
  })

  it('returns placeholder when key missing for non-dev ciphertext', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'f'.repeat(64)
    const payload = encryptMessage('secret', aad)
    delete process.env.CHAT_ENCRYPTION_KEY
    expect(decryptMessage(payload, aad)).toMatch(/thiếu khóa|mã hóa/i)
  })
})
