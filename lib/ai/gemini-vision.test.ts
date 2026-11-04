import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGeminiVisionRequest,
  extractQuestionsWithGemini,
  questionsJsonFromModelText,
  textFromGeminiBody,
} from '@/lib/ai/gemini-vision'

describe('buildGeminiVisionRequest', () => {
  it('sends one image part per page and asks for JSON', () => {
    const body = buildGeminiVisionRequest(
      [
        { base64: 'aaa', mimeType: 'image/png' },
        { base64: 'bbb', mimeType: 'image/jpeg' },
      ],
      'system rules',
    )
    expect(body.systemInstruction.parts[0]?.text).toBe('system rules')
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.contents[0]?.parts).toEqual([
      { inline_data: { mime_type: 'image/png', data: 'aaa' } },
      { inline_data: { mime_type: 'image/jpeg', data: 'bbb' } },
      { text: 'Extract all questions from these exam pages.' },
    ])
  })
})

describe('questionsJsonFromModelText', () => {
  it('reads questions from a fenced JSON body', () => {
    const parsed = questionsJsonFromModelText(
      '```json\n{"questions":[{"type":"ESSAY","content":"1+1"}]}\n```',
    )
    expect(parsed.questions).toEqual([{ type: 'ESSAY', content: '1+1' }])
  })

  it('rejects text that is not a JSON object', () => {
    expect(() => questionsJsonFromModelText('not json')).toThrow(
      'AI không trả về kết quả',
    )
  })
})

describe('textFromGeminiBody', () => {
  it('joins text parts and ignores an empty candidate', () => {
    expect(
      textFromGeminiBody({
        candidates: [{ content: { parts: [{ text: '{"questions":[]}' }] } }],
      }),
    ).toBe('{"questions":[]}')
    expect(() => textFromGeminiBody({ candidates: [] })).toThrow(
      'AI không trả về kết quả',
    )
  })
})

describe('extractQuestionsWithGemini', () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY
    vi.unstubAllEnvs()
  })

  it('does not put the provider body on a failed response', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const fetchImpl = vi.fn(async () => new Response('secret upstream', { status: 500 }))
    await expect(
      extractQuestionsWithGemini(
        [{ base64: 'aaa', mimeType: 'image/png' }],
        'system',
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow('Không thể phân tích ảnh đề')
    expect(fetchImpl).toHaveBeenCalledOnce()
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).toMatchObject({ 'x-goog-api-key': 'test-key' })
    const sent = JSON.parse(String(init.body)) as { contents: { parts: unknown[] }[] }
    expect(sent.contents[0]?.parts).toHaveLength(2)
  })
})
