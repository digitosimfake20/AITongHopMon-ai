'use client'

import { Bot, MessageSquareDashed } from 'lucide-react'
import {
  ZENO_CHAT_OPEN_EVENT,
  type ZenoChatOpenDetail,
} from '@/components/chat/zeno-chat-events'

const STARTERS = [
  {
    label: 'Giải thích phép nhân phân thức',
    prompt: 'Giải thích cho tôi phép nhân phân thức',
  },
  {
    label: 'Tại sao a/0 không xác định?',
    prompt: 'Tại sao a/0 không xác định?',
  },
  {
    label: 'Hướng dẫn giải phương trình bậc 2',
    prompt: 'Hướng dẫn giải phương trình bậc 2',
  },
  {
    label: 'Ôn hàm số bậc nhất',
    prompt: 'Ôn lại kiến thức hàm số bậc nhất',
  },
]

function openZenoChat(prompt: string) {
  window.dispatchEvent(
    new CustomEvent<ZenoChatOpenDetail>(ZENO_CHAT_OPEN_EVENT, {
      detail: { prompt },
    }),
  )
}

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center sm:py-16">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-zeno/15 sm:size-20 sm:rounded-3xl">
        <Bot className="size-8 text-zeno sm:size-10" aria-hidden />
      </div>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-foreground">
          Hỏi đáp với Zeno
        </h1>
        <p className="mt-2 text-muted-foreground">
          Chọn gợi ý bên dưới hoặc mở nút{' '}
          <span className="inline-flex items-center gap-1 rounded-full bg-zeno/15 px-2 py-0.5 text-sm font-medium text-zeno">
            <Bot className="size-3.5" aria-hidden />
            Zeno
          </span>{' '}
          ở góc dưới bên phải.
        </p>
      </div>

      <ul className="mt-2 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTERS.map((starter) => (
          <li key={starter.label}>
            <button
              type="button"
              onClick={() => openZenoChat(starter.prompt)}
              className="flex min-h-11 w-full items-start gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:border-zeno/40 hover:bg-zeno/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno"
            >
              <MessageSquareDashed className="mt-0.5 size-4 shrink-0 text-zeno" aria-hidden />
              <span className="text-sm text-foreground/80">{starter.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="max-w-md text-xs text-muted-foreground">
        Zeno dùng hồ sơ học tập của bạn để trả lời sát bài hơn.
      </p>
    </div>
  )
}
