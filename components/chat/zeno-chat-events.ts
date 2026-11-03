/** Custom event so chat page starters can open + prefill the shell modal. */
export const ZENO_CHAT_OPEN_EVENT = 'zeno-chat-open'

export type ZenoChatOpenDetail = { prompt?: string }
