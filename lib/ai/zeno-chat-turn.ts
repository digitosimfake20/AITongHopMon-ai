/**
 * Shared Zeno turn prepare / stream / finalize — usable from server actions
 * and the SSE route (must not live in a top-level "use server" module).
 */
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import { encryptMessage, decryptMessage } from '@/lib/ai/chat-crypto'
import { chatMessageLengthError, isChatSessionId } from '@/lib/ai/chat-limits'
import {
  buildZenoSystemPrompt,
  buildZenoSystemPromptLight,
  buildRecentMessageContext,
} from '@/lib/ai/build-zeno-memory'
import type { ActionResult } from '@/lib/auth/types'
import type OpenAI from 'openai'

/** Cap decrypted history returned to the modal (newest N). */
export const CHAT_HISTORY_TAKE = 50

const SHORT_TURN_MAX_CHARS = 120
const SHORT_TURN_MAX_SESSION_MSGS = 8
const SHORT_TURN_CONTEXT_LIMIT = 6
const FULL_TURN_CONTEXT_LIMIT = 20

export type ZenoChatCompletionMessage = OpenAI.Chat.ChatCompletionMessageParam

export interface ZenoTurnPrep {
  studentId: string
  sessionId: string
  userMessage: string
  assistantSeq: number
  openaiMessages: ZenoChatCompletionMessage[]
  lightPrompt: boolean
}

function isShortTurn(message: string, sessionMessageCount: number): boolean {
  return (
    message.trim().length <= SHORT_TURN_MAX_CHARS &&
    sessionMessageCount < SHORT_TURN_MAX_SESSION_MSGS
  )
}

/** Auth, session resolve, persist user message, build OpenAI messages. */
export async function prepareZenoTurn(input: {
  sessionId?: unknown
  message: string
}): Promise<ActionResult<ZenoTurnPrep>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') return { success: false, error: 'Chỉ học sinh mới có thể chat với Zeno' }

  const message = input.message.trim()
  if (!message) return { success: false, error: 'Tin nhắn không được để trống' }
  const lengthError = chatMessageLengthError(message)
  if (lengthError) return { success: false, error: lengthError }

  let ownedSessionId: string
  let sessionMessageCount = 0

  if (input.sessionId === undefined) {
    const created = await prisma.chatSession.create({
      data: {
        studentId: user.id,
        subject: 'Toán 8',
        title: `Hỏi đáp ${new Date().toLocaleDateString('vi-VN')}`,
        messageCount: 0,
      },
    })
    ownedSessionId = created.id
  } else if (!isChatSessionId(input.sessionId)) {
    return { success: false, error: 'Phiên chat không tồn tại' }
  } else {
    const session = await prisma.chatSession.findFirst({
      where: { id: input.sessionId, studentId: user.id },
      select: { id: true, messageCount: true },
    })
    if (!session) return { success: false, error: 'Phiên chat không tồn tại' }
    ownedSessionId = session.id
    sessionMessageCount = session.messageCount
  }

  const lastMsg = await prisma.chatMessage.findFirst({
    where: { sessionId: ownedSessionId },
    orderBy: { sequenceNumber: 'desc' },
    select: { sequenceNumber: true },
  })
  const nextSeq = (lastMsg?.sequenceNumber ?? 0) + 1

  const encUserMsg = encryptMessage(message, {
    sessionId: ownedSessionId,
    studentId: user.id,
    sequenceNumber: nextSeq,
    sender: 'user',
  })
  await prisma.chatMessage.create({
    data: {
      sessionId: ownedSessionId,
      sender: 'user',
      sequenceNumber: nextSeq,
      encryptedContent: encUserMsg.encryptedContent,
      iv: encUserMsg.iv,
      authTag: encUserMsg.authTag,
    },
  })

  const light = isShortTurn(message, sessionMessageCount)
  const contextLimit = light ? SHORT_TURN_CONTEXT_LIMIT : FULL_TURN_CONTEXT_LIMIT

  const [prompt, recentHistory] = await Promise.all([
    light
      ? buildZenoSystemPromptLight(user.id).then((system) => ({
          system,
          untrustedData: null as string | null,
        }))
      : buildZenoSystemPrompt(user.id),
    buildRecentMessageContext(ownedSessionId, user.id, contextLimit),
  ])

  // recentHistory already includes the just-saved user message; avoid duplicating it.
  const historyWithoutCurrent = recentHistory.slice(0, -1)

  const openaiMessages: ZenoChatCompletionMessage[] = [
    { role: 'system', content: prompt.system },
    ...(prompt.untrustedData
      ? [{ role: 'user' as const, content: prompt.untrustedData }]
      : []),
    ...historyWithoutCurrent,
    { role: 'user', content: message },
  ]

  return {
    success: true,
    data: {
      studentId: user.id,
      sessionId: ownedSessionId,
      userMessage: message,
      assistantSeq: nextSeq + 1,
      openaiMessages,
      lightPrompt: light,
    },
  }
}

/** Persist assistant reply, bump session count, maybe fire chunk summary. */
export async function finalizeZenoTurn(input: {
  studentId: string
  sessionId: string
  assistantSeq: number
  reply: string
}): Promise<{ messageCount: number }> {
  const { studentId, sessionId, assistantSeq, reply } = input

  const encAiMsg = encryptMessage(reply, {
    sessionId,
    studentId,
    sequenceNumber: assistantSeq,
    sender: 'assistant',
  })
  await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'assistant',
      sequenceNumber: assistantSeq,
      encryptedContent: encAiMsg.encryptedContent,
      iv: encAiMsg.iv,
      authTag: encAiMsg.authTag,
    },
  })

  const updatedSession = await prisma.chatSession.update({
    where: { id: sessionId },
    data: { messageCount: { increment: 2 } },
  })

  const totalMessages = updatedSession.messageCount
  if (totalMessages > 0 && totalMessages % 15 === 0) {
    void generateChunkSummary(studentId, sessionId, totalMessages)
  }

  return { messageCount: totalMessages }
}

/** OpenAI streaming completion for the prepared messages. */
export async function createZenoChatStream(messages: ZenoChatCompletionMessage[]) {
  const openai = getOpenAIClient()
  return openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  })
}

async function generateChunkSummary(
  studentId: string,
  sessionId: string,
  currentCount: number,
): Promise<void> {
  try {
    const startSeq = Math.max(1, currentCount - 14)
    const endSeq = currentCount

    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId,
        sequenceNumber: { gte: startSeq, lte: endSeq },
      },
      orderBy: { sequenceNumber: 'asc' },
    })

    const transcript = messages
      .map((m) => {
        const text = decryptMessage(
          {
            encryptedContent: m.encryptedContent,
            iv: m.iv,
            authTag: m.authTag,
          },
          {
            sessionId,
            studentId,
            sequenceNumber: m.sequenceNumber,
            sender: m.sender === 'user' ? 'user' : 'assistant',
          },
        )
        return `${m.sender === 'user' ? 'HS' : 'Zeno'}: ${text}`
      })
      .join('\n')

    const openai = getOpenAIClient()
    const summaryResp = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      messages: [
        {
          role: 'system',
          content:
            'Tóm tắt ngắn gọn (tối đa 150 từ) đoạn hội thoại sau giữa học sinh và Zeno AI. Nêu rõ: chủ đề bàn đến, tiến bộ học sinh đạt được, vấn đề còn tồn đọng. Trả về JSON: {"summary": "...", "topics": ["..."], "progress": "..."}',
        },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const summaryJson = JSON.parse(summaryResp.choices[0]?.message?.content ?? '{}')

    await prisma.chatChunkSummary.create({
      data: {
        sessionId,
        startSeq,
        endSeq,
        summaryJson,
      },
    })

    const snippet = `[${new Date().toLocaleDateString('vi-VN')}] ${summaryJson.summary ?? ''}`
    const existing = await prisma.globalAgentMemory.findUnique({ where: { studentId } })

    if (existing) {
      const combined = `${existing.longTermSummary}\n${snippet}`.slice(-2000)
      await prisma.globalAgentMemory.update({
        where: { studentId },
        data: {
          longTermSummary: combined,
          totalProcessedMessages: existing.totalProcessedMessages + 15,
          keyInsights: {
            ...(existing.keyInsights as object),
            recentTopics: summaryJson.topics ?? [],
          },
        },
      })
    } else {
      await prisma.globalAgentMemory.create({
        data: {
          studentId,
          longTermSummary: snippet,
          keyInsights: { recentTopics: summaryJson.topics ?? [] },
          totalProcessedMessages: 15,
        },
      })
    }
  } catch (err) {
    console.error('[Zeno] Chunk summary generation failed:', err)
  }
}
