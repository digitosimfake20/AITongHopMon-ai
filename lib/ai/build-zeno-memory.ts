/**
 * Memory Context Builder for Zeno Chat.
 * Assembles a rich system prompt from:
 *  - student_cognitive_profiles
 *  - global_agent_memories
 *  - last 3 chat_chunk_summaries
 */
import prisma from '@/lib/prisma'
import { decryptMessage } from './chat-crypto'

function personaPedagogyHint(personaType: string | undefined): string {
  switch (personaType) {
    case 'Nhanh nhạy nhưng ẩu':
      return 'Học sinh hay làm nhanh và mắc lỗi cẩu thả. Hãy nhẹ nhàng nhắc em kiểm tra lại dấu, đơn vị và bước tính trước khi kết luận.'
    case 'Cẩn thận - Ngâm lâu':
      return 'Học sinh suy nghĩ rất chậm và cẩn thận. Khuyến khích em tự tin hơn và đưa ra gợi ý nhỏ để tháo gỡ bế tắc nhanh hơn.'
    case 'Thành thạo':
      return 'Học sinh thành thạo tốt. Hãy đưa ra câu hỏi nâng cao, khuyến khích tư duy sâu hơn và liên hệ kiến thức.'
    case 'Chắc chắn, tốc độ tốt':
      return 'Học sinh làm chắc và tốc độ ổn. Giữ nhịp luyện tập, thỉnh thoảng thêm bài hơi khó để mở rộng.'
    default:
      return 'Hãy giải thích từng bước rõ ràng, kiên nhẫn và động viên học sinh.'
  }
}

/** Full memory-backed system prompt (profile + long-term + recent chunk summaries). */
export async function buildZenoSystemPrompt(studentId: string): Promise<string> {
  // ── Parallel fetch of all context sources ────────────────────────────────
  const [user, profile, memory, recentChunks] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { fullName: true },
    }),
    prisma.studentCognitiveProfile.findUnique({
      where: { studentId },
    }),
    prisma.globalAgentMemory.findUnique({
      where: { studentId },
    }),
    prisma.chatChunkSummary.findMany({
      where: {
        session: { studentId },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  // ── Format sections ───────────────────────────────────────────────────────
  const studentName = user?.fullName ?? 'Học sinh'

  const profileSection = profile
    ? `- Tên học sinh: ${studentName}
- Persona: ${profile.personaType}
- Tốc độ trả lời trung bình: ${Number(profile.avgSpeedPerQuestion).toFixed(0)}s / câu
- Tỷ lệ làm ẩu: ${(Number(profile.carelessErrorRate) * 100).toFixed(0)}%
- Điểm mạnh đã biết: ${profile.strengthsSummary.length > 0 ? profile.strengthsSummary.join(', ') : 'Chưa xác định'}
- Điểm yếu đã biết: ${profile.weaknessesSummary.length > 0 ? profile.weaknessesSummary.join(', ') : 'Chưa xác định'}`
    : `- Tên học sinh: ${studentName}
- Chưa có đủ dữ liệu học tập để xây dựng hồ sơ.`

  const keyInsights = memory?.keyInsights as
    | { curatedInsight?: string; nextPracticeTopics?: string[] }
    | null
    | undefined

  const curated =
    keyInsights?.curatedInsight?.trim() ||
    (keyInsights?.nextPracticeTopics?.length
      ? `Nên luyện: ${keyInsights.nextPracticeTopics.slice(0, 3).join(', ')}.`
      : '')

  const longTermSection = [
    curated ? `Insight gần nhất: ${curated}` : null,
    memory?.longTermSummary?.trim() || null,
  ]
    .filter(Boolean)
    .join('\n') || 'Chưa có dữ liệu bộ nhớ dài hạn.'

  const recentChunkSection = recentChunks.length > 0
    ? recentChunks
        .map((c) => {
          const json = c.summaryJson as Record<string, string>
          return json?.summary ?? JSON.stringify(c.summaryJson).slice(0, 200)
        })
        .join('\n---\n')
    : 'Chưa có tóm tắt cuộc trò chuyện gần đây.'

  const personaHint = personaPedagogyHint(profile?.personaType)

  // ── Assemble final prompt ─────────────────────────────────────────────────
  return `Bạn là Zeno — gia sư AI thông minh, đồng cảm, là người bạn học đáng tin cậy dành cho học sinh lớp 6-9.

[HỒ SƠ HỌC SINH & BỘ NHỚ NGỮ CẢNH]
${profileSection}

[NHẬT KÝ BỘ NHỚ DÀI HẠN CỦA ZENO]
${longTermSection}

[TÓM TẮT CÁC BUỔI CHAT GẦN ĐÂY]
${recentChunkSection}

[HƯỚNG DẪN SƯ PHẠM]
1. Tham chiếu tự nhiên đến lịch sử trò chuyện khi phù hợp (ví dụ: "Hôm trước em có hỏi chú về Phân thức nghịch đảo...").
2. ${personaHint}
3. Luôn trình bày Toán học bằng LaTeX chuẩn: $inline$ hoặc $$display$$.
4. Ngắn gọn, hỗ trợ, khuyến khích học sinh tự giải quyết vấn đề thay vì đưa đáp án ngay.
5. Nếu học sinh hỏi bài ngoài phạm vi Toán 8, hãy nhẹ nhàng hướng lại.
6. Trả lời bằng tiếng Việt trừ khi học sinh viết bằng tiếng Anh.`
}

/**
 * Lightweight system prompt for short turns — skips long-term memory + chunk
 * summaries (two DB reads) while keeping name/persona for pedagogy.
 */
export async function buildZenoSystemPromptLight(studentId: string): Promise<string> {
  const [user, profile] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { fullName: true },
    }),
    prisma.studentCognitiveProfile.findUnique({
      where: { studentId },
      select: { personaType: true },
    }),
  ])

  const studentName = user?.fullName ?? 'Học sinh'
  const personaHint = personaPedagogyHint(profile?.personaType)

  return `Bạn là Zeno — gia sư AI Toán cho học sinh lớp 6-9. Học sinh: ${studentName}.
${personaHint}
Trình bày công thức bằng LaTeX ($inline$ / $$display$$). Ngắn gọn, khuyến khích tự giải. Trả lời tiếng Việt trừ khi học sinh dùng tiếng Anh.`
}

// ---------------------------------------------------------------------------
// Context used during chat for message history (last N messages in a session)
// ---------------------------------------------------------------------------

export interface ChatMessageContext {
  role: 'user' | 'assistant'
  content: string
}

export async function buildRecentMessageContext(
  sessionId: string,
  limit = 20,
): Promise<ChatMessageContext[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { sequenceNumber: 'desc' },
    take: limit,
  })

  return messages
    .reverse()
    .map((m) => ({
      role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: decryptMessage({
        encryptedContent: m.encryptedContent,
        iv: m.iv,
        authTag: m.authTag,
      }),
    }))
}
