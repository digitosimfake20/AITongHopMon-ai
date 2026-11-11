'use server'

import { requireTeacher } from '@/lib/auth/require-teacher'
import { getSessionUser } from '@/lib/auth/session'
import {
  AI_FEATURES_PAUSED_MESSAGE,
  getOpenAIClient,
  isOpenAIKeyMissingError,
  OPENAI_MODEL_CHAT,
} from '@/lib/ai/openai'
import { remedialSuggestionSchema } from '@/lib/ai/model-json-schemas'

export interface RemedialSuggestion {
  summary: string
  activities: Array<{
    title: string
    description: string
    type: 'exercise' | 'video' | 'discussion' | 'quiz'
  }>
}

export type RemedialResult =
  | { ok: true; data: RemedialSuggestion }
  | { ok: false; error: string }

export async function generateRemedialSuggestionAction(
  topic: string,
  wrongCount: number,
  studentPercent: number,
): Promise<RemedialResult> {
  const user = await getSessionUser()
  const authError = requireTeacher(user)
  if (authError) return { ok: false, error: authError }

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_CHAT,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý giáo viên Toán THCS Việt Nam. 
Khi được cung cấp một chủ đề kiến thức mà nhiều học sinh đang mắc lỗi, hãy đề xuất các hoạt động phụ đạo cụ thể.

Trả về JSON theo schema sau:
{
  "summary": "Phân tích ngắn gọn lý do học sinh thường mắc lỗi ở chủ đề này (2-3 câu)",
  "activities": [
    {
      "title": "Tên hoạt động",
      "description": "Mô tả cụ thể (1-2 câu), bao gồm dạng bài, số câu đề xuất",
      "type": "exercise | video | discussion | quiz"
    }
  ]
}

Đề xuất 3-4 hoạt động đa dạng, thực tế và phù hợp chương trình Toán 8.`,
        },
        {
          role: 'user',
          content: `Chủ đề: "${topic}"
Số lượt sai: ${wrongCount}
Tỉ lệ học sinh gặp khó: ${studentPercent}%

Hãy gợi ý các hoạt động phụ đạo phù hợp.`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Kết quả AI không hợp lệ' }
    }
    const parsed = remedialSuggestionSchema.safeParse(json)
    if (!parsed.success) {
      return { ok: false, error: 'AI trả về sai định dạng' }
    }
    return { ok: true, data: parsed.data }
  } catch (err) {
    console.error('[teacher-ai] generateRemedialSuggestion error:', err)
    if (isOpenAIKeyMissingError(err)) {
      return { ok: false, error: AI_FEATURES_PAUSED_MESSAGE }
    }
    return { ok: false, error: 'Không thể tạo gợi ý. Vui lòng thử lại.' }
  }
}
