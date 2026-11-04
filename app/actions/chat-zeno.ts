'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import { decryptMessage } from '@/lib/ai/chat-crypto'
import { isChatSessionId } from '@/lib/ai/chat-limits'
import {
  CHAT_HISTORY_TAKE,
  prepareZenoTurn,
  finalizeZenoTurn,
} from '@/lib/ai/zeno-chat-turn'
import type { ActionResult } from '@/lib/auth/types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChatMessageDisplay {
  id: string
  sender: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  messageCount: number
  createdAt: string
}

// ---------------------------------------------------------------------------
// Send a message to Zeno and receive a reply (non-streaming fallback)
// ---------------------------------------------------------------------------

export async function sendZenoMessageAction(input: {
  sessionId?: string
  message: string
}): Promise<ActionResult<{ sessionId: string; reply: string; messageCount: number }>> {
  const prep = await prepareZenoTurn(input)
  if (!prep.success || !prep.data) {
    return { success: false, error: prep.error ?? 'Không thể chuẩn bị tin nhắn' }
  }

  let reply: string
  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      messages: prep.data.openaiMessages,
      temperature: 0.7,
      max_tokens: 1024,
    })
    reply =
      completion.choices[0]?.message?.content ??
      'Xin lỗi, Zeno không thể trả lời lúc này. Hãy thử lại nhé!'
  } catch (err) {
    console.error('[Zeno] completion failed:', err)
    return { success: false, error: 'Zeno tạm thời không trả lời được. Thử lại sau.' }
  }

  const { messageCount } = await finalizeZenoTurn({
    studentId: prep.data.studentId,
    sessionId: prep.data.sessionId,
    assistantSeq: prep.data.assistantSeq,
    reply,
  })

  return {
    success: true,
    data: { sessionId: prep.data.sessionId, reply, messageCount },
  }
}

// ---------------------------------------------------------------------------
// Get chat sessions for the logged-in student
// ---------------------------------------------------------------------------

export async function getChatSessionsAction(): Promise<ActionResult<ChatSessionSummary[]>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  const sessions = await prisma.chatSession.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, messageCount: true, createdAt: true },
  })

  return {
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messageCount,
      createdAt: s.createdAt.toISOString(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Get message history for a specific session (capped + incremental decrypt)
// ---------------------------------------------------------------------------

export async function getChatHistoryAction(
  sessionId: unknown,
): Promise<ActionResult<ChatMessageDisplay[]>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (!isChatSessionId(sessionId)) {
    return { success: false, error: 'Phiên chat không tồn tại' }
  }

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, studentId: user.id },
    select: { id: true },
  })
  if (!session) return { success: false, error: 'Phiên chat không tồn tại' }

  // Newest N first, then reverse for chronological UI order.
  const newest = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { sequenceNumber: 'desc' },
    take: CHAT_HISTORY_TAKE,
    select: {
      id: true,
      sender: true,
      sequenceNumber: true,
      encryptedContent: true,
      iv: true,
      authTag: true,
      createdAt: true,
    },
  })

  const chronological = newest.reverse()
  const decrypted: ChatMessageDisplay[] = []
  for (const m of chronological) {
    decrypted.push({
      id: m.id,
      sender: m.sender === 'user' ? 'user' : 'assistant',
      content: decryptMessage(
        {
          encryptedContent: m.encryptedContent,
          iv: m.iv,
          authTag: m.authTag,
        },
        {
          sessionId: session.id,
          studentId: user.id,
          sequenceNumber: m.sequenceNumber,
          sender: m.sender === 'user' ? 'user' : 'assistant',
        },
      ),
      createdAt: m.createdAt.toISOString(),
    })
  }

  return { success: true, data: decrypted }
}
