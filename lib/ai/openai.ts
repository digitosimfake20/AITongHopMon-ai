import OpenAI from 'openai'

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Thiếu OPENAI_API_KEY trong biến môi trường')
    }
    client = new OpenAI({ apiKey })
  }
  return client
}

export const OPENAI_MODEL_CHAT = process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini'
/** Full GPT-4o used for vision / image-based extraction (better OCR accuracy for math). */
export const OPENAI_MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4o'
