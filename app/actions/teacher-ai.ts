'use server'

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    const parsed = JSON.parse(raw) as RemedialSuggestion
    return { ok: true, data: parsed }
  } catch (err) {
    console.error('[teacher-ai] generateRemedialSuggestion error:', err)
    return { ok: false, error: 'Không thể tạo gợi ý. Vui lòng thử lại.' }
  }
}
