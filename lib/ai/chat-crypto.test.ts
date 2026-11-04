import { afterEach, describe, expect, it } from 'vitest'
import { decryptMessage, encryptMessage } from '@/lib/ai/chat-crypto'

const PREV_KEY = process.env.CHAT_ENCRYPTION_KEY

afterEach(() => {
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
    const payload = encryptMessage(plaintext)
    expect(payload.iv).not.toBe('000000000000000000000000')
    expect(payload.encryptedContent).not.toContain(plaintext)
    expect(decryptMessage(payload)).toBe(plaintext)
  })

  it('uses distinct IVs per encryption', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'b'.repeat(64)
    const a = encryptMessage('same')
    const b = encryptMessage('same')
    expect(a.iv).not.toBe(b.iv)
    expect(a.encryptedContent).not.toBe(b.encryptedContent)
  })
})

describe('chat-crypto (dev fallback)', () => {
  it('round-trips via base64 when key is missing', () => {
    delete process.env.CHAT_ENCRYPTION_KEY
    const payload = encryptMessage('dev mode text')
    expect(payload.iv).toBe('000000000000000000000000')
    expect(decryptMessage(payload)).toBe('dev mode text')
  })

  it('returns placeholder when key missing for non-dev ciphertext', () => {
    process.env.CHAT_ENCRYPTION_KEY = 'c'.repeat(64)
    const payload = encryptMessage('secret')
    delete process.env.CHAT_ENCRYPTION_KEY
    expect(decryptMessage(payload)).toMatch(/thiếu khóa|mã hóa/i)
  })
})
