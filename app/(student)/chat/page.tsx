import { Bot, MessageSquareDashed } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center sm:py-16">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-950 sm:size-20 sm:rounded-3xl">
        <Bot className="size-8 text-teal-600 sm:size-10" aria-hidden />
      </div>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-foreground">
          Hỏi đáp với Zeno
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mở nút{' '}
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-sm font-medium text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <Bot className="size-3.5" aria-hidden />
            Zeno
          </span>{' '}
          ở góc dưới bên phải để trò chuyện về Toán.
        </p>
      </div>

      <ul className="mt-2 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          'Giải thích cho tôi phép nhân phân thức',
          'Tại sao $\\frac{a}{0}$ không xác định?',
          'Hướng dẫn giải phương trình bậc 2',
          'Ôn lại kiến thức hàm số bậc nhất',
        ].map((prompt) => (
          <li
            key={prompt}
            className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left"
          >
            <MessageSquareDashed className="mt-0.5 size-4 shrink-0 text-teal-500" aria-hidden />
            <p className="text-sm text-foreground/80">{prompt}</p>
          </li>
        ))}
      </ul>

      <p className="max-w-md text-xs text-muted-foreground">
        Zeno dùng hồ sơ học tập của bạn để trả lời sát bài hơn.
      </p>
    </div>
  )
}
