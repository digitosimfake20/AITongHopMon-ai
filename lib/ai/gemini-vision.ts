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
 * User-turn extract instructions. Schema MUST match VISION_SYSTEM_PROMPT /
 * normalizeQuestion in app/actions/parse-quiz-file.ts — do not invent fields.
 */
export const USER_TEXT = `Extract ALL questions from these exam page images.

STRICT OUTPUT RULES (non-negotiable):
1. Return ONLY one JSON object. No markdown, no code fences, no commentary, no trailing text.
2. Top-level shape MUST be exactly: {"questions":[...]}
3. Every question MUST use only these fields (omit unused ones; do not invent others):
   - "type": one of "MULTIPLE_CHOICE" | "TRUE_FALSE_GROUP" | "SHORT_ANSWER" | "ESSAY"
   - "topic": string (2–4 word Vietnamese math sub-topic; required)
   - "content": string (stem; use $...$ / $$...$$ for math)
   - "options": string[4] — MULTIPLE_CHOICE only; strip "A."/"B."/"C."/"D." prefixes
   - "correctAnswer": number 0–3 for MULTIPLE_CHOICE; string for SHORT_ANSWER
   - "subQuestions": [{ "label": "a"|"b"|..., "content": string, "correctAnswer": boolean }] — TRUE_FALSE_GROUP only
   - "explanation": string (optional)
4. Do NOT wrap the object in an array. Do NOT use alternate keys (e.g. "items", "data", "answer").
5. Do NOT freestyle a different schema — the downstream parser rejects unknown shapes and falls back to a weaker path.

EXAMPLE of the exact JSON shape to return (illustrative content only):
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "topic": "Phép nhân phân thức",
      "content": "Tính $\\\\dfrac{1}{2} \\\\times \\\\dfrac{3}{4}$.",
      "options": ["$\\\\dfrac{3}{8}$", "$\\\\dfrac{4}{6}$", "$\\\\dfrac{1}{4}$", "$\\\\dfrac{7}{8}$"],
      "correctAnswer": 0
    },
    {
      "type": "TRUE_FALSE_GROUP",
      "topic": "Điều kiện xác định",
      "content": "Cho biểu thức $\\\\dfrac{x}{x-1}$. Xét các phát biểu sau:",
      "subQuestions": [
        { "label": "a", "content": "Biểu thức xác định khi $x \\\\neq 1$.", "correctAnswer": true },
        { "label": "b", "content": "Biểu thức xác định khi $x = 1$.", "correctAnswer": false }
      ]
    },
    {
      "type": "SHORT_ANSWER",
      "topic": "Rút gọn biểu thức",
      "content": "Rút gọn $\\\\dfrac{6}{9}$. Đáp số:",
      "correctAnswer": "$\\\\dfrac{2}{3}$"
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
