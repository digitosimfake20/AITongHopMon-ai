/**
 * AES-256-GCM symmetric encryption for chat messages.
 * Key is read from CHAT_ENCRYPTION_KEY env var (hex, 64 chars = 32 bytes).
 * Falls back to a dev-mode base64 encode when no key is configured.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12   // 96-bit nonce for GCM
const TAG_BYTES = 16  // 128-bit auth tag

function getKey(): Buffer | null {
  const hex = process.env.CHAT_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) return null
  return Buffer.from(hex, 'hex')
}

export interface EncryptedPayload {
  encryptedContent: string // hex
  iv: string               // hex (12 bytes)
  authTag: string          // hex (16 bytes)
}

/** Encrypts plaintext. Falls back to base64 if no key is configured. */
export function encryptMessage(plaintext: string): EncryptedPayload {
  const key = getKey()
  if (!key) {
    // Dev fallback — store as base64, empty crypto fields
    return {
      encryptedContent: Buffer.from(plaintext, 'utf8').toString('base64'),
      iv: '000000000000000000000000',       // 12 bytes zero
      authTag: '00000000000000000000000000000000', // 16 bytes zero
    }
  }

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedContent: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

/** Decrypts payload. Falls back to base64 decode if iv is all zeros (dev mode). */
export function decryptMessage(payload: EncryptedPayload): string {
  const { encryptedContent, iv, authTag } = payload

  // Dev fallback detection — iv is all zeros
  if (iv === '000000000000000000000000') {
    return Buffer.from(encryptedContent, 'base64').toString('utf8')
  }

  const key = getKey()
  if (!key) {
    // Key was removed after encryption — return placeholder
    return '[Tin nhắn đã bị mã hóa — thiếu khóa giải mã]'
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedContent, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
