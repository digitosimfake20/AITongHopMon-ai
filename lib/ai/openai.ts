import OpenAI from 'openai'

let client: OpenAI | null = null

/** Thrown / matched when OPENAI_API_KEY is unset — boundaries should pause AI, not crash. */
export const OPENAI_KEY_MISSING_ERROR = 'Thiếu OPENAI_API_KEY trong biến môi trường'

/** User-facing pause copy aligned with README / .env.example. */
export const AI_FEATURES_PAUSED_MESSAGE =
  'Chức năng AI tạm tắt. Cấu hình OPENAI_API_KEY để bật lại.'

export function isOpenAIKeyMissingError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('OPENAI_API_KEY')
}

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(OPENAI_KEY_MISSING_ERROR)
    }
    client = new OpenAI({ apiKey })
  }
  return client
}

export const OPENAI_MODEL_CHAT = process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini'
/** Full GPT-4o used for vision / image-based extraction (better OCR accuracy for math). */
export const OPENAI_MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4o'
