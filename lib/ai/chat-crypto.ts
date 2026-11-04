/**
 * AES-256-GCM for chat messages.
 * CHAT_ENCRYPTION_KEY is hex; only a decode of exactly 32 bytes is a key.
 * AAD binds each ciphertext to session, student, sequence, and sender.
 * Non-production without a key stores base64 under a zero IV.
 * Production never writes that fallback, and a zero IV is never plaintext
 * once a real key exists or when NODE_ENV is production.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit nonce for GCM
const ZERO_IV = '000000000000000000000000'
const ZERO_AUTH_TAG = '00000000000000000000000000000000'
const MISSING_KEY_PLACEHOLDER = '[Tin nhắn đã bị mã hóa — thiếu khóa giải mã]'

export interface ChatMessageAad {
  sessionId: string
  studentId: string
  sequenceNumber: number
  sender: 'user' | 'assistant'
}

export interface EncryptedPayload {
  encryptedContent: string // hex, or base64 in the non-production fallback
  iv: string // hex (12 bytes)
  authTag: string // hex (16 bytes)
}

function getKey(): Buffer | null {
  const hex = process.env.CHAT_ENCRYPTION_KEY
  if (typeof hex !== 'string') return null
  const key = Buffer.from(hex, 'hex')
  // A trailing non-hex tail still decodes to 32 bytes, so require a round-trip.
  if (key.length !== 32) return null
  if (key.toString('hex') !== hex.toLowerCase()) return null
  return key
}

/** Stable UTF-8 binding. Field order and newline separators do not change. */
function aadBytes(aad: ChatMessageAad): Buffer {
  const canonical = [
    aad.sessionId,
    aad.studentId,
    String(aad.sequenceNumber),
    aad.sender,
  ].join('\n')
  return Buffer.from(canonical, 'utf8')
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Encrypts plaintext. Refuses to write a zero IV in production when no key is set. */
export function encryptMessage(plaintext: string, aad: ChatMessageAad): EncryptedPayload {
  const key = getKey()
  if (!key) {
    if (isProduction()) {
      throw new Error('Thiếu khóa mã hóa hội thoại')
    }
    return {
      encryptedContent: Buffer.from(plaintext, 'utf8').toString('base64'),
      iv: ZERO_IV,
      authTag: ZERO_AUTH_TAG,
    }
  }

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(aadBytes(aad))
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedContent: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

/**
 * Decrypts payload.
 * A zero IV is plaintext only outside production when no 32-byte key is set.
 */
export function decryptMessage(payload: EncryptedPayload, aad: ChatMessageAad): string {
  const { encryptedContent, iv, authTag } = payload
  const key = getKey()

  if (iv === ZERO_IV) {
    if (isProduction() || key) {
      throw new Error('Không giải mã được tin nhắn')
    }
    return Buffer.from(encryptedContent, 'base64').toString('utf8')
  }

  if (!key) {
    if (isProduction()) {
      throw new Error('Không giải mã được tin nhắn')
    }
    return MISSING_KEY_PLACEHOLDER
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
  decipher.setAAD(aadBytes(aad))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedContent, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
