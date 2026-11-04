import {
  prepareZenoTurn,
  createZenoChatStream,
  finalizeZenoTurn,
} from '@/lib/ai/zeno-chat-turn'

export const runtime = 'nodejs'

type SseEvent =
  | { type: 'meta'; sessionId: string; lightPrompt: boolean }
  | { type: 'token'; text: string }
  | { type: 'done'; sessionId: string; messageCount: number }
  | { type: 'error'; error: string }

function encodeSse(event: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: Request): Promise<Response> {
  let body: { sessionId?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message : ''
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined

  const prep = await prepareZenoTurn({ sessionId, message })
  if (!prep.success || !prep.data) {
    return Response.json({ error: prep.error ?? 'Không thể chuẩn bị tin nhắn' }, { status: 400 })
  }

  const turn = prep.data

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encodeSse({
          type: 'meta',
          sessionId: turn.sessionId,
          lightPrompt: turn.lightPrompt,
        }),
      )

      let reply = ''
      try {
        const completion = await createZenoChatStream(turn.openaiMessages)
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (!text) continue
          reply += text
          controller.enqueue(encodeSse({ type: 'token', text }))
        }

        if (!reply.trim()) {
          reply = 'Xin lỗi, Zeno không thể trả lời lúc này. Hãy thử lại nhé!'
          controller.enqueue(encodeSse({ type: 'token', text: reply }))
        }

        const { messageCount } = await finalizeZenoTurn({
          studentId: turn.studentId,
          sessionId: turn.sessionId,
          assistantSeq: turn.assistantSeq,
          reply,
        })

        controller.enqueue(
          encodeSse({ type: 'done', sessionId: turn.sessionId, messageCount }),
        )
      } catch (err) {
        console.error('[Zeno] stream failed:', err)
        controller.enqueue(
          encodeSse({
            type: 'error',
            error: 'Zeno tạm thời không trả lời được. Thử lại sau.',
          }),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
