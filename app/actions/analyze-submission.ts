'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import type { ActionResult } from '@/lib/auth/types'
import { masteryStatusFromAccuracyPercent } from '@/lib/knowledge/mastery-labels'
import { normalizeTopicName, topicToNodeId } from '@/lib/knowledge/topic-normalize'
import { ensureTopicsCanonicalized } from '@/lib/knowledge/topic-canonicalize-ai'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TopicMastery {
  topic: string
  topicKey?: string
  total: number
  correct: number
  accuracy: number  // 0–100
  status: 'WEAK' | 'MEDIUM' | 'MASTERED'
  advice?: string
  pMastery?: number
}

export interface AIAnalysis {
  praise: string
  knowledgeGaps: Array<{ issue: string; advice: string }>
  topicMastery?: TopicMastery[]
  nextStep?: {
    type: 'practice'
    topicKeys: string[]
    topicTitles: string[]
  } | null
  signals?: {
    carelessCount: number
    stuckCount: number
  }
}

/** @deprecated Adaptive routing is deterministic in lib/adaptive/adaptive-logic.ts */
export type AdaptiveAction = 'UPGRADE' | 'RETRY_SAME' | 'DOWNGRADE' | 'SEEK_TEACHER'

/** @deprecated Unused — keep type for legacy JSON only */
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
      "topicKey": "slug-chu-de (khớp đúng danh sách cung cấp)",
      "topic": "Tên chủ đề",
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
    if (item.questionId && item.topic) {
      topicMap.set(item.questionId, normalizeTopicName(item.topic))
    }
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
    submission.details.map((d) => [
      d.questionId,
      normalizeTopicName(d.question.topic),
    ]),
  )

  if (isGenericTopicSet(submission.details)) {
    const fixed = await autoFixTopics(openai, submission.details)
    for (const [qid, topic] of fixed) resolvedTopics.set(qid, topic)
  }

  const uniqueTopicLabels = [...new Set(resolvedTopics.values())]
  const canonicalMap = await ensureTopicsCanonicalized(uniqueTopicLabels, 'Toán')

  // Persist canonical topicKey on questions (fire-and-forget)
  Promise.all(
    [...resolvedTopics.entries()].map(([questionId, rawLabel]) => {
      const canonical = canonicalMap.get(rawLabel) ?? {
        topicName: rawLabel,
        topicKey: topicToNodeId(rawLabel),
      }
      return prisma.question
        .update({
          where: { id: questionId },
          data: { topic: canonical.topicName, topicKey: canonical.topicKey },
        })
        .catch(() => null)
    }),
  ).catch(() => null)

  // ── Compute topic mastery from canonical topics ─────────────────────────────
  const topicMap = new Map<string, { topic: string; topicKey: string; total: number; correct: number }>()
  for (const d of submission.details) {
    const raw = normalizeTopicName(resolvedTopics.get(d.questionId))
    const canonical = canonicalMap.get(raw) ?? {
      topicName: raw,
      topicKey: topicToNodeId(raw),
    }
    const key = canonical.topicKey
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topic: canonical.topicName,
        topicKey: key,
        total: 0,
        correct: 0,
      })
    }
    const entry = topicMap.get(key)!
    entry.total++
    if (d.isCorrect) entry.correct++
  }

  const topicMasteryBase = [...topicMap.values()].map((stats) => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    const status = masteryStatusFromAccuracyPercent(accuracy)
    return {
      topic: stats.topic,
      topicKey: stats.topicKey,
      total: stats.total,
      correct: stats.correct,
      accuracy,
      status,
    }
  })

  const weakTopics = topicMasteryBase
    .filter((t) => t.status !== 'MASTERED')
    .map(
      (t) =>
        `topicKey="${t.topicKey}" "${t.topic}" (đúng ${t.correct}/${t.total} câu, ${t.accuracy}%)`,
    )

  // ── Build AI prompt ─────────────────────────────────────────────────────────
  const questionSummaries = submission.details.map((d, i) => {
    const topic = resolvedTopics.get(d.questionId) || d.question.topic
    return `Câu ${i + 1} [${d.question.type}|${topic}]: ${d.isCorrect ? '✓' : '✗'} — ${d.timeSpentSeconds}s — "${d.question.content.slice(0, 120)}"`
  })

  const userPrompt = `Tổng điểm: ${Number(submission.score)}/10 | Số câu đúng: ${submission.correctCount}/${submission.totalQuestions} | Thời gian: ${submission.timeSpentSeconds}s

Các chủ đề cần advice (dùng đúng topicKey trong JSON):
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

  let parsed: {
    praise: string
    knowledgeGaps: AIAnalysis['knowledgeGaps']
    topicAdvice?: { topicKey?: string; topic?: string; advice: string }[]
  }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, error: 'Kết quả AI không hợp lệ' }
  }

  // ── Merge AI advice by topicKey (fallback: exact topic name) ───────────────
  const adviceByKey = new Map<string, string>()
  const adviceByName = new Map<string, string>()
  for (const t of parsed.topicAdvice ?? []) {
    if (!t.advice) continue
    if (t.topicKey) adviceByKey.set(t.topicKey, t.advice)
    if (t.topic) adviceByName.set(t.topic, t.advice)
  }
  const topicMastery: TopicMastery[] = topicMasteryBase.map((t) => ({
    ...t,
    advice: (t.topicKey && adviceByKey.get(t.topicKey)) || adviceByName.get(t.topic),
  }))

  const weakForPractice = topicMasteryBase
    .filter((t) => t.status !== 'MASTERED')
    .slice(0, 3)

  const analysis: AIAnalysis = {
    praise: parsed.praise,
    knowledgeGaps: parsed.knowledgeGaps ?? [],
    topicMastery,
    nextStep:
      weakForPractice.length > 0
        ? {
            type: 'practice',
            topicKeys: weakForPractice.map((t) => t.topicKey),
            topicTitles: weakForPractice.map((t) => t.topic),
          }
        : null,
  }

  // Persist the analysis so it loads fast next time
  await prisma.submission.update({
    where: { id: submissionId },
    data: { aiFeedbackSummary: JSON.stringify(analysis) },
  })

  return { success: true, data: analysis }
}

/**
 * @deprecated Adaptive L2 routing is deterministic via
 * `recommendRound2Difficulty` in lib/adaptive/adaptive-logic.ts.
 * Kept as a no-op stub so old imports do not break; do not call.
 */
export async function routeAdaptiveQuizAction(_input: {
  score: number
  attemptNumber: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}): Promise<ActionResult<AdaptiveRouting>> {
  return {
    success: false,
    error: 'Định tuyến thích ứng dùng thuật toán điểm số, không còn gọi AI.',
  }
}
