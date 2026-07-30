'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import { encryptMessage, decryptMessage } from '@/lib/ai/chat-crypto'
import { buildZenoSystemPrompt, buildRecentMessageContext } from '@/lib/ai/build-zeno-memory'
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
// Send a message to Zeno and receive a reply
// ---------------------------------------------------------------------------

export async function sendZenoMessageAction(input: {
  sessionId?: string
  message: string
}): Promise<ActionResult<{ sessionId: string; reply: string; messageCount: number }>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') return { success: false, error: 'Chỉ học sinh mới có thể chat với Zeno' }

  const { message } = input
  if (!message.trim()) return { success: false, error: 'Tin nhắn không được để trống' }

  // ── 1. Get or create chat session ─────────────────────────────────────────
  let sessionId = input.sessionId

  if (!sessionId) {
    const newSession = await prisma.chatSession.create({
      data: {
        studentId: user.id,
        subject: 'Toán 8',
        title: `Hỏi đáp ${new Date().toLocaleDateString('vi-VN')}`,
        messageCount: 0,
      },
    })
    sessionId = newSession.id
  } else {
    // Verify session belongs to this student
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, studentId: user.id },
    })
    if (!session) return { success: false, error: 'Phiên chat không tồn tại' }
  }

  // ── 2. Determine next sequence number ─────────────────────────────────────
  const lastMsg = await prisma.chatMessage.findFirst({
    where: { sessionId },
    orderBy: { sequenceNumber: 'desc' },
    select: { sequenceNumber: true },
  })
  const nextSeq = (lastMsg?.sequenceNumber ?? 0) + 1

  // ── 3. Save user message ───────────────────────────────────────────────────
  const encUserMsg = encryptMessage(message)
  await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'user',
      sequenceNumber: nextSeq,
      encryptedContent: encUserMsg.encryptedContent,
      iv: encUserMsg.iv,
      authTag: encUserMsg.authTag,
    },
  })

  // ── 4. Build context and call OpenAI ──────────────────────────────────────
  const [systemPrompt, recentHistory] = await Promise.all([
    buildZenoSystemPrompt(user.id),
    buildRecentMessageContext(sessionId, 20),
  ])

  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    messages: [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })

  const reply = completion.choices[0]?.message?.content ?? 'Xin lỗi, Zeno không thể trả lời lúc này. Hãy thử lại nhé!'

  // ── 5. Save assistant message ──────────────────────────────────────────────
  const encAiMsg = encryptMessage(reply)
  await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'assistant',
      sequenceNumber: nextSeq + 1,
      encryptedContent: encAiMsg.encryptedContent,
      iv: encAiMsg.iv,
      authTag: encAiMsg.authTag,
    },
  })

  // ── 6. Update session message count ───────────────────────────────────────
  const updatedSession = await prisma.chatSession.update({
    where: { id: sessionId },
    data: { messageCount: { increment: 2 } },
  })

  // ── 7. Trigger memory summarization every 15 messages ─────────────────────
  const totalMessages = updatedSession.messageCount
  if (totalMessages > 0 && totalMessages % 15 === 0) {
    // Fire and forget
    void generateChunkSummary(user.id, sessionId, totalMessages)
  }

  return {
    success: true,
    data: { sessionId, reply, messageCount: totalMessages },
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
// Get message history for a specific session
// ---------------------------------------------------------------------------

export async function getChatHistoryAction(
  sessionId: string,
): Promise<ActionResult<ChatMessageDisplay[]>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, studentId: user.id },
  })
  if (!session) return { success: false, error: 'Phiên chat không tồn tại' }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { sequenceNumber: 'asc' },
  })

  const decrypted: ChatMessageDisplay[] = messages.map((m) => ({
    id: m.id,
    sender: m.sender === 'user' ? 'user' : 'assistant',
    content: decryptMessage({
      encryptedContent: m.encryptedContent,
      iv: m.iv,
      authTag: m.authTag,
    }),
    createdAt: m.createdAt.toISOString(),
  }))

  return { success: true, data: decrypted }
}

// ---------------------------------------------------------------------------
// Internal: generate a Level-1 chunk summary and update global memory
// ---------------------------------------------------------------------------

async function generateChunkSummary(
  studentId: string,
  sessionId: string,
  currentCount: number,
): Promise<void> {
  try {
    const startSeq = Math.max(1, currentCount - 14)
    const endSeq = currentCount

    // Fetch messages in this chunk
    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId,
        sequenceNumber: { gte: startSeq, lte: endSeq },
      },
      orderBy: { sequenceNumber: 'asc' },
    })

    const transcript = messages
      .map((m) => {
        const text = decryptMessage({
          encryptedContent: m.encryptedContent,
          iv: m.iv,
          authTag: m.authTag,
        })
        return `${m.sender === 'user' ? 'HS' : 'Zeno'}: ${text}`
      })
      .join('\n')

    const openai = getOpenAIClient()
    const summaryResp = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      messages: [
        {
          role: 'system',
          content: 'Tóm tắt ngắn gọn (tối đa 150 từ) đoạn hội thoại sau giữa học sinh và Zeno AI. Nêu rõ: chủ đề bàn đến, tiến bộ học sinh đạt được, vấn đề còn tồn đọng. Trả về JSON: {"summary": "...", "topics": ["..."], "progress": "..."}'
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

    // Update global memory long-term summary
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
