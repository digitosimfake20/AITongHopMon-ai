/**
 * Page images → Gemini → question JSON.
 * One inline image part per page. The teacher still reviews the result before save.
 */

export interface VisionImage {
  base64: string
  mimeType: string
}

const FIXED_FAILURE = 'Không thể phân tích ảnh đề'
const EMPTY_RESULT = 'AI không trả về kết quả'
const USER_TEXT = 'Extract all questions from these exam pages.'

export function geminiVisionModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

export function buildGeminiVisionRequest(
  images: VisionImage[],
  systemPrompt: string,
) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          ...images.map((image) => ({
            inline_data: {
              mime_type: image.mimeType,
              data: image.base64,
            },
          })),
          { text: USER_TEXT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  }
}

export function questionsJsonFromModelText(raw: string): { questions?: unknown } {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error(EMPTY_RESULT)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(EMPTY_RESULT)
  }
  return parsed as { questions?: unknown }
}

export function textFromGeminiBody(body: unknown): string {
  const candidates = (body as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  } | null)?.candidates
  const parts = candidates?.[0]?.content?.parts ?? []
  const text = parts.map((part) => part.text ?? '').join('')
  if (!text.trim()) throw new Error(EMPTY_RESULT)
  return text
}

export async function extractQuestionsWithGemini(
  images: VisionImage[],
  systemPrompt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ questions?: unknown }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Thiếu GEMINI_API_KEY trong biến môi trường')

  const model = geminiVisionModel()
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiVisionRequest(images, systemPrompt)),
      signal: AbortSignal.timeout(30_000),
    },
  )

  if (!response.ok) {
    console.error('[gemini-vision] request failed', response.status)
    throw new Error(FIXED_FAILURE)
  }

  return questionsJsonFromModelText(textFromGeminiBody(await response.json()))
}
