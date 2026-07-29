'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import type { ActionResult } from '@/lib/auth/types'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TopicMastery {
  topic: string
  total: number
  correct: number
  accuracy: number  // 0–100
  status: 'WEAK' | 'MEDIUM' | 'MASTERED'
  advice?: string
}

export interface AIAnalysis {
  praise: string
  knowledgeGaps: Array<{ issue: string; advice: string }>
  topicMastery?: TopicMastery[]
}

export type AdaptiveAction = 'UPGRADE' | 'RETRY_SAME' | 'DOWNGRADE' | 'SEEK_TEACHER'

export interface AdaptiveRouting {
  analysis: string
  recommendedAction: AdaptiveAction
  messageToStudent: string
}

// ---------------------------------------------------------------------------
// WORKFLOW 1: Single Quiz Analysis
// ---------------------------------------------------------------------------

const ANALYSIS_SYSTEM_PROMPT = `Bạn là gia sư thông minh của nền tảng học tập Zeno. Nhiệm vụ của bạn là phân tích kết quả bài kiểm tra của học sinh và đưa ra phản hồi cá nhân hóa bằng tiếng Việt.

QUY TẮC PHÂN TÍCH:
1. Thời gian làm bài mỗi câu:
   - Sai + nhanh (< 15 giây): học sinh đoán mò / làm ẩu.
   - Sai + chậm (> 120 giây): học sinh gặp khó khăn thực sự, có lỗ hổng kiến thức nghiêm trọng.
   - Đúng + rất nhanh (< 10 giây): học sinh nắm vững.

2. Loại câu sai:
   - TRUE_FALSE_GROUP: yếu lý thuyết, nhớ chưa chắc.
   - SHORT_ANSWER: yếu kỹ năng tính toán / suy luận.
   - MULTIPLE_CHOICE: có thể do nhầm lẫn hoặc thiếu kiến thức.
   - ESSAY: cần xem xét thêm (không tự chấm được).

3. Khen ngợi học sinh trung thực, không sáo rỗng.

4. Với mỗi chủ đề yếu (accuracy < 80%), hãy đưa ra 1 câu gợi ý học tập cụ thể.

OUTPUT JSON FORMAT (không có markdown, chỉ JSON thuần):
{
  "praise": "Lời khen ngợi ngắn gọn, chân thực (1-2 câu)",
  "knowledgeGaps": [
    {
      "issue": "Mô tả lỗ hổng hoặc điểm yếu cụ thể",
      "advice": "Lời khuyên cụ thể để cải thiện"
    }
  ],
  "topicAdvice": [
    {
      "topic": "Tên chủ đề (phải khớp chính xác tên được cung cấp)",
      "advice": "1 câu gợi ý học tập ngắn gọn, cụ thể cho chủ đề này"
    }
  ]
}`

/** Detect if all questions share the same topic (generic quiz-title repetition). */
function isGenericTopicSet(details: Array<{ questionId: string; question: { topic: string } }>): boolean {
  const unique = new Set(details.map((d) => d.question.topic?.trim().toLowerCase() || ''))
  if (unique.size <= 1) return true   // all identical
  return false
}

/** Ask GPT to assign granular 2-4 word sub-topics per question and persist to DB. */
async function autoFixTopics(
  openai: ReturnType<typeof getOpenAIClient>,
  details: Array<{ questionId: string; question: { content: string; type: string } }>,
): Promise<Map<string, string>> {
  const lines = details.map((d, i) =>
    `Q${i + 1} id="${d.questionId}": [${d.question.type}] ${d.question.content.slice(0, 180)}`,
  )

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      {
        role: 'system',
        content: `Bạn là chuyên gia phân loại câu hỏi Toán THCS Việt Nam.
Với mỗi câu hỏi, hãy gán một chủ đề con cụ thể, ngắn gọn (2-4 từ tiếng Việt).
Ví dụ: "Phép nhân phân thức", "Điều kiện xác định", "Rút gọn biểu thức", "Phân thức nghịch đảo", "Quy đồng mẫu thức", "Phép chia phân thức", "Giá trị biểu thức".
KHÔNG dùng tên chủ đề chung chung như "Đại số", "Phân thức", "Toán học".

OUTPUT JSON (chỉ JSON thuần):
{ "topics": [{ "questionId": "...", "topic": "Phép nhân phân thức" }, ...] }`,
      },
      { role: 'user', content: lines.join('\n') },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: { topics?: { questionId: string; topic: string }[] }
  try { parsed = JSON.parse(raw) } catch { parsed = {} }

  const topicMap = new Map<string, string>()
  for (const item of parsed.topics ?? []) {
    if (item.questionId && item.topic) topicMap.set(item.questionId, item.topic)
  }

  // Persist new topics to DB in background (fire and forget, don't block analysis)
  if (topicMap.size > 0) {
    Promise.all(
      [...topicMap.entries()].map(([id, topic]) =>
        prisma.question.update({ where: { id }, data: { topic } }).catch(() => null),
      ),
    ).catch(() => null)
  }

  return topicMap
}

export async function analyzeSubmissionAction(
  submissionId: string,
): Promise<ActionResult<AIAnalysis>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  // Fetch submission with details + questions (including topic)
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      details: {
        include: {
          question: {
            select: { id: true, type: true, topic: true, content: true, correctOption: true, options: true },
          },
        },
      },
    },
  })

  if (!submission) return { success: false, error: 'Không tìm thấy bài nộp' }
  if (submission.studentId !== user.id) return { success: false, error: 'Không có quyền truy cập' }

  const openai = getOpenAIClient()

  // ── Auto-fix generic topics ────────────────────────────────────────────────
  // Build a mutable topic map — may be overridden by AI classification below
  const resolvedTopics = new Map(
    submission.details.map((d) => [d.questionId, d.question.topic || '']),
  )

  if (isGenericTopicSet(submission.details)) {
    const fixed = await autoFixTopics(openai, submission.details)
    for (const [qid, topic] of fixed) resolvedTopics.set(qid, topic)
  }

  // ── Compute topic mastery from (possibly fixed) topics ─────────────────────
  const topicMap = new Map<string, { total: number; correct: number }>()
  for (const d of submission.details) {
    const topic = resolvedTopics.get(d.questionId) || 'Chủ đề chung'
    if (!topicMap.has(topic)) topicMap.set(topic, { total: 0, correct: 0 })
    const entry = topicMap.get(topic)!
    entry.total++
    if (d.isCorrect) entry.correct++
  }

  const topicMasteryBase = [...topicMap.entries()].map(([topic, stats]) => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    const status: TopicMastery['status'] =
      accuracy >= 80 ? 'MASTERED' : accuracy >= 50 ? 'MEDIUM' : 'WEAK'
    return { topic, ...stats, accuracy, status }
  })

  const weakTopics = topicMasteryBase
    .filter((t) => t.status !== 'MASTERED')
    .map((t) => `"${t.topic}" (đúng ${t.correct}/${t.total} câu, ${t.accuracy}%)`)

  // ── Build AI prompt ─────────────────────────────────────────────────────────
  const questionSummaries = submission.details.map((d, i) => {
    const topic = resolvedTopics.get(d.questionId) || d.question.topic
    return `Câu ${i + 1} [${d.question.type}|${topic}]: ${d.isCorrect ? '✓' : '✗'} — ${d.timeSpentSeconds}s — "${d.question.content.slice(0, 120)}"`
  })

  const userPrompt = `Tổng điểm: ${Number(submission.score)}/10 | Số câu đúng: ${submission.correctCount}/${submission.totalQuestions} | Thời gian: ${submission.timeSpentSeconds}s

Các chủ đề cần được gợi ý học tập:
${weakTopics.length > 0 ? weakTopics.join('\n') : '(Không có chủ đề yếu)'}

Chi tiết từng câu:
${questionSummaries.join('\n')}`

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) return { success: false, error: 'AI không phản hồi' }

  let parsed: { praise: string; knowledgeGaps: AIAnalysis['knowledgeGaps']; topicAdvice?: { topic: string; advice: string }[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, error: 'Kết quả AI không hợp lệ' }
  }

  // ── Merge AI advice into topic mastery ─────────────────────────────────────
  const adviceMap = new Map((parsed.topicAdvice ?? []).map((t) => [t.topic, t.advice]))
  const topicMastery: TopicMastery[] = topicMasteryBase.map((t) => ({
    ...t,
    advice: adviceMap.get(t.topic),
  }))

  const analysis: AIAnalysis = {
    praise: parsed.praise,
    knowledgeGaps: parsed.knowledgeGaps ?? [],
    topicMastery,
  }

  // Persist the analysis so it loads fast next time
  await prisma.submission.update({
    where: { id: submissionId },
    data: { aiFeedbackSummary: JSON.stringify(analysis) },
  })

  return { success: true, data: analysis }
}

// ---------------------------------------------------------------------------
// WORKFLOW 2: Adaptive Quiz Routing
// ---------------------------------------------------------------------------

const ROUTING_SYSTEM_PROMPT = `Bạn là hệ thống định tuyến bài tập thích ứng của nền tảng Zeno. Nhiệm vụ là phân tích kết quả học sinh và đề xuất bước tiếp theo phù hợp bằng tiếng Việt.

QUY TẮC ĐỊNH TUYẾN:
- Điểm >= 8.0: UPGRADE — nâng lên mức độ khó hơn.
- Điểm < 8.0 + Lần thử 1: RETRY_SAME — khuyến khích ôn tập và thử lại cùng mức.
- Điểm < 8.0 + Lần thử 2 + Mức MEDIUM hoặc HARD: DOWNGRADE — hạ xuống mức dễ hơn để củng cố.
- Điểm < 8.0 + Lần thử 2 + Mức EASY: SEEK_TEACHER — cần giáo viên hỗ trợ trực tiếp.

OUTPUT JSON FORMAT (không có markdown, chỉ JSON thuần):
{
  "analysis": "Phân tích ngắn gọn về kết quả (1-2 câu)",
  "recommendedAction": "UPGRADE | RETRY_SAME | DOWNGRADE | SEEK_TEACHER",
  "messageToStudent": "Lời nhắn thân thiện, khích lệ học sinh thực hiện bước tiếp theo"
}`

export async function routeAdaptiveQuizAction(input: {
  score: number
  attemptNumber: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}): Promise<ActionResult<AdaptiveRouting>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  const difficultyLabel: Record<string, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Trung bình',
    HARD: 'Khó',
  }

  const userPrompt = `Điểm: ${input.score}/10 | Lần thử: ${input.attemptNumber} | Mức độ hiện tại: ${difficultyLabel[input.difficulty] ?? input.difficulty}`

  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      { role: 'system', content: ROUTING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) return { success: false, error: 'AI không phản hồi' }

  try {
    const routing = JSON.parse(raw) as AdaptiveRouting
    return { success: true, data: routing }
  } catch {
    return { success: false, error: 'Kết quả AI không hợp lệ' }
  }
}
