import { Bot, MessageSquareDashed } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-teal-100 dark:bg-teal-950">
        <Bot className="size-10 text-teal-600" />
      </div>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Hỏi đáp với Zeno AI
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Zeno là gia sư AI thông minh của bạn. Nhấn vào nút{' '}
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-sm font-medium text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <Bot className="size-3.5" />
            Zeno
          </span>{' '}
          ở góc dưới bên phải màn hình để bắt đầu trò chuyện!
        </p>
      </div>

      <div className="mt-2 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          'Giải thích cho tôi phép nhân phân thức',
          'Tại sao $\\frac{a}{0}$ không xác định?',
          'Hướng dẫn giải phương trình bậc 2',
          'Ôn lại kiến thức hàm số bậc nhất',
        ].map((prompt) => (
          <div
            key={prompt}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-800/50"
          >
            <MessageSquareDashed className="mt-0.5 size-4 shrink-0 text-teal-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{prompt}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Zeno ghi nhớ lịch sử học tập và cá nhân hóa câu trả lời dựa trên hồ sơ tư duy của bạn.
      </p>
    </div>
  )
}
