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

/**
 * User-turn extract instructions. Item shape matches the owner template
 * (Zalo template.txt) and VISION_SYSTEM_PROMPT / normalizeQuestion —
 * do not invent fields. Top-level is wrapped as {"questions":[...]} for
 * the parser; a bare question array is also accepted at parse time.
 */
export const USER_TEXT = `Extract ALL questions from these exam page images.

STRICT OUTPUT RULES (non-negotiable):
1. Return ONLY valid JSON. No markdown, no code fences, no commentary, no trailing text, no [cite: N] markers.
2. Preferred top-level shape: {"questions":[ ...question objects... ]}
   - A bare JSON array of question objects (owner template style) is also accepted.
   - Do NOT use alternate wrappers ("items", "data", "result", "answer", etc.).
3. Every question object MUST STRICTLY match this field set (omit unused ones; do not invent others):
   - "type": "MULTIPLE_CHOICE" | "TRUE_FALSE_GROUP" | "SHORT_ANSWER" | "ESSAY"
   - "topic": string (concise Vietnamese math sub-topic; required)
   - "points": number (usually 1)
   - "content": string (stem; use $...$ / $$...$$ for math)
   - "options": string[4] — MULTIPLE_CHOICE only; STRIP "A."/"B."/"C."/"D." prefixes
   - "correctAnswer": number 0–3 for MULTIPLE_CHOICE; string for SHORT_ANSWER
   - "subQuestions": [{ "label": "a"|"b"|"c"|"d", "content": string, "correctAnswer": boolean }] — TRUE_FALSE_GROUP only
   - "explanation": string (optional; no citation markers)
4. Do NOT freestyle a different schema — the downstream parser rejects unknown shapes and falls back to a weaker path.

EXAMPLE (preferred wrapper + owner template item shape):
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "topic": "Đa thức",
      "points": 1,
      "content": "Một đa thức hai biến bậc hai thu gọn có thể có tối đa bao nhiêu hạng tử khác 0?",
      "options": ["3", "4", "5", "6"],
      "explanation": "Các hạng tử có thể có là $x^2, y^2, xy, x, y$ và hằng số (tối đa 6 hạng tử).",
      "correctAnswer": 3
    },
    {
      "type": "TRUE_FALSE_GROUP",
      "topic": "Biến đổi đa thức",
      "points": 1,
      "content": "Cho đa thức $A = x^4 - (x - y)(x + y)(x^2 + y^2) - y^4$. Xét tính đúng sai của các phát biểu sau:",
      "subQuestions": [
        { "label": "a", "content": "Đa thức A sau khi khai triển và thu gọn có bậc là 4.", "correctAnswer": false },
        { "label": "b", "content": "Giá trị của đa thức A luôn bằng 0 với mọi x, y.", "correctAnswer": true },
        { "label": "c", "content": "Giá trị của A phụ thuộc vào biến y nhưng không phụ thuộc vào x.", "correctAnswer": false },
        { "label": "d", "content": "Đây là một đa thức không.", "correctAnswer": true }
      ]
    },
    {
      "type": "SHORT_ANSWER",
      "topic": "Ứng dụng đa thức",
      "points": 1,
      "content": "Viết đa thức biểu thị diện tích phần còn lại của một miếng bìa hình vuông cạnh a sau khi cắt bỏ một hình tròn bán kính r (dùng $\\\\pi$).",
      "explanation": "$S = a^2 - \\\\pi r^2$.",
      "correctAnswer": "a^2-\\\\pir^2"
    }
  ]
}

Now extract from the attached page image(s) using that SAME schema STRICTLY.`

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
  // Owner template / common Gemini freestyle: bare question array
  if (Array.isArray(parsed)) {
    return { questions: parsed }
  }
  if (!parsed || typeof parsed !== 'object') {
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
