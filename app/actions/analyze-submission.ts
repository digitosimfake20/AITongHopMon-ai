'use server'

import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import type { ActionResult } from '@/lib/auth/types'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AIAnalysis {
  praise: string
  knowledgeGaps: Array<{ issue: string; advice: string }>
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

OUTPUT JSON FORMAT (không có markdown, chỉ JSON thuần):
{
  "praise": "Lời khen ngợi ngắn gọn, chân thực (1-2 câu)",
  "knowledgeGaps": [
    {
      "issue": "Mô tả lỗ hổng hoặc điểm yếu cụ thể",
      "advice": "Lời khuyên cụ thể để cải thiện"
    }
  ]
}`

export async function analyzeSubmissionAction(
  submissionId: string,
): Promise<ActionResult<AIAnalysis>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  // Fetch submission with details + questions
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      details: {
        include: {
          question: {
            select: { type: true, content: true, correctOption: true, options: true },
          },
        },
      },
    },
  })

  if (!submission) return { success: false, error: 'Không tìm thấy bài nộp' }
  if (submission.studentId !== user.id) return { success: false, error: 'Không có quyền truy cập' }

  // Build analysis payload
  const questionSummaries = submission.details.map((d) => ({
    type: d.question.type,
    content: d.question.content.slice(0, 200),
    isCorrect: d.isCorrect,
    timeSpentSeconds: d.timeSpentSeconds,
    pointsEarned: d.pointsEarned,
    studentAnswer: d.selectedOption,
    correctAnswer: d.question.correctOption,
  }))

  const userPrompt = `Tổng điểm: ${Number(submission.score)}/10 | Số câu đúng: ${submission.correctCount}/${submission.totalQuestions} | Thời gian: ${submission.timeSpentSeconds}s

Chi tiết từng câu:
${questionSummaries.map((q, i) => (
  `Câu ${i + 1} [${q.type}]: ${q.isCorrect ? '✓' : '✗'} — ${q.timeSpentSeconds}s — ${q.pointsEarned}đ — "${q.content}"`
)).join('\n')}`

  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_CHAT,
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 1000,
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) return { success: false, error: 'AI không phản hồi' }

  let analysis: AIAnalysis
  try {
    analysis = JSON.parse(raw) as AIAnalysis
  } catch {
    return { success: false, error: 'Kết quả AI không hợp lệ' }
  }

  // Persist the analysis so it loads fast next time
  await prisma.submission.update({
    where: { id: submissionId },
    data: { aiFeedbackSummary: raw },
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
