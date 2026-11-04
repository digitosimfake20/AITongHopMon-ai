/** Canonical UUID text: 8-4-4-4-12 hex. Objects and other strings are not session ids. */
const CHAT_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isChatSessionId(value: unknown): value is string {
  return typeof value === 'string' && CHAT_SESSION_ID_RE.test(value)
}

export const MAX_CHAT_MESSAGE_CHARS = 2000

export const CHAT_MESSAGE_TOO_LONG_ERROR =
  `Tin nhắn không được dài quá ${MAX_CHAT_MESSAGE_CHARS} ký tự`

export function isChatMessageTooLong(message: string): boolean {
  return message.trim().length > MAX_CHAT_MESSAGE_CHARS
}

/** Fixed Vietnamese error when the trimmed message exceeds the cap, otherwise null. */
export function chatMessageLengthError(message: string): string | null {
  return isChatMessageTooLong(message) ? CHAT_MESSAGE_TOO_LONG_ERROR : null
}
