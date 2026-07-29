'use server'

import OpenAI from 'openai'
import { getOpenAIClient, OPENAI_MODEL_CHAT } from '@/lib/ai/openai'
import type { ParsedQuestion } from '@/lib/quiz/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudentFeedbackResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export interface GeneratedQuizQuestion {
  id: string
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  content: string
  options?: Array<{ id: string; content: string }>
  correctAnswer: number | string
  explanation: string
  points: number
  topic: string
}

export type PersonalizedQuizResult =
  | { ok: true; questions: GeneratedQuizQuestion[] }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// ACTION 1: Draft Parent / Student Note
// ---------------------------------------------------------------------------

export async function generateStudentFeedbackAction(input: {
  studentName: string
  avgScore: number
  weakTopics: string[]
  behaviorSignals: string[]
}): Promise<StudentFeedbackResult> {
  const openai = getOpenAIClient()

  const weakTopicList = input.weakTopics.length > 0
    ? input.weakTopics.map((t) => `- ${t}`).join('\n')
    : '(Không có chủ đề yếu rõ ràng)'

  const signalList = input.behaviorSignals.length > 0
    ? input.behaviorSignals.map((s) => `- ${s}`).join('\n')
    : '(Không có tín hiệu hành vi đặc biệt)'

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      temperature: 0.6,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý giáo viên. Hãy soạn một tin nhắn lịch sự, khích lệ, mang tính sư phạm để gửi cho phụ huynh hoặc học sinh về tình hình học tập của em đó.

Yêu cầu:
- Bằng tiếng Việt, giọng điệu nhẹ nhàng, xây dựng.
- Không quá 200 chữ.
- Nêu điểm mạnh trước, sau đó nhẹ nhàng đề cập điểm cần cải thiện.
- Kết thúc bằng lời khích lệ và đề xuất hành động cụ thể (ví dụ: luyện thêm dạng đó, gặp thầy/cô).
- Không dùng ngôn ngữ tiêu cực hoặc gây áp lực.`,
        },
        {
          role: 'user',
          content: `Thông tin về học sinh:
- Tên: ${input.studentName}
- Điểm trung bình: ${input.avgScore.toFixed(1)}/10
- Chủ đề yếu:
${weakTopicList}
- Tín hiệu hành vi:
${signalList}

Hãy soạn tin nhắn nhận xét.`,
        },
      ],
    })

    const message = completion.choices[0]?.message?.content
    if (!message) return { ok: false, error: 'AI không phản hồi' }
    return { ok: true, message }
  } catch (err) {
    console.error('[teacher-student-ai] generateStudentFeedback error:', err)
    return { ok: false, error: 'Không thể tạo nhận xét. Vui lòng thử lại.' }
  }
}

// ---------------------------------------------------------------------------
// ACTION 2: Generate 1-Click Personalized Remedial Quiz
// ---------------------------------------------------------------------------

export async function generatePersonalizedQuizAction(input: {
  studentName: string
  weakTopics: string[]
}): Promise<PersonalizedQuizResult> {
  if (input.weakTopics.length === 0) {
    return { ok: false, error: 'Không có chủ đề yếu để tạo bài tập.' }
  }

  const openai: OpenAI = getOpenAIClient()
  const topicList = input.weakTopics.slice(0, 4).join(', ')

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `Bạn là giáo viên Toán THCS Việt Nam tạo bài tập phụ đạo cá nhân hóa.
Tạo CHÍNH XÁC 5 câu hỏi luyện tập ngắn tập trung vào các chủ đề yếu được chỉ định.

OUTPUT JSON (chỉ JSON thuần, không có markdown):
{
  "questions": [
    {
      "id": "q1",
      "type": "MULTIPLE_CHOICE" hoặc "SHORT_ANSWER",
      "topic": "Tên chủ đề",
      "content": "Nội dung câu hỏi (sử dụng LaTeX $...$ cho công thức)",
      "options": [  // Chỉ khi type = MULTIPLE_CHOICE
        { "id": "A", "content": "..." },
        { "id": "B", "content": "..." },
        { "id": "C", "content": "..." },
        { "id": "D", "content": "..." }
      ],
      "correctAnswer": 0,  // index 0-3 cho MC, hoặc string cho SA
      "explanation": "Giải thích ngắn gọn",
      "points": 2
    }
  ]
}

Quy tắc:
- Đảm bảo câu hỏi phù hợp chương trình Toán 8.
- Mỗi câu hỏi phải thuộc một trong các chủ đề yếu được liệt kê.
- Dùng LaTeX với dấu $...$ cho công thức inline.
- Tổng điểm = 10 (phân bổ cho 5 câu).`,
        },
        {
          role: 'user',
          content: `Học sinh: ${input.studentName}
Chủ đề yếu cần luyện: ${topicList}

Tạo 5 câu hỏi phụ đạo phù hợp.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return { ok: false, error: 'AI không phản hồi' }

    let parsed: { questions: GeneratedQuizQuestion[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Kết quả AI không hợp lệ' }
    }

    if (!Array.isArray(parsed.questions)) {
      return { ok: false, error: 'AI trả về sai định dạng' }
    }

    return { ok: true, questions: parsed.questions }
  } catch (err) {
    console.error('[teacher-student-ai] generatePersonalizedQuiz error:', err)
    return { ok: false, error: 'Không thể tạo bài tập. Vui lòng thử lại.' }
  }
}
