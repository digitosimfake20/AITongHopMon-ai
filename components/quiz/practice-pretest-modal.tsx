'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, BookOpen, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addSavedPractice } from '@/lib/quiz/active-quiz-session'

interface PracticePreTestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  testId: string
  title: string
  topic: string
  questionCount: number
  timeLimitMinutes: number
}

export function PracticePreTestModal({
  open,
  onOpenChange,
  testId,
  title,
  topic,
  questionCount,
  timeLimitMinutes,
}: PracticePreTestModalProps) {
  const router = useRouter()

  if (!open) return null

  function handleStart() {
    onOpenChange(false)
    router.push(`/quiz/take/${testId}?start=1`)
  }

  function handleSaveLater() {
    addSavedPractice({
      testId,
      title,
      topic,
      questionCount,
      timeLimitMinutes,
      savedAt: Date.now(),
    })
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button
          type="button"
          aria-label="Đóng"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Bạn đã sẵn sàng chưa?</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Zeno đã trộn câu hỏi Dễ &amp; Trung bình từ kho đề để bạn ôn lại nền tảng.
        </p>

        <div className="mb-5 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {timeLimitMinutes} phút
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {questionCount} câu hỏi
            </span>
          </div>
          <p>
            Chủ đề ôn tập: <strong className="text-foreground">{topic}</strong>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleStart}>
            Bắt đầu làm bài
          </Button>
          <Button variant="outline" className="w-full" onClick={handleSaveLater}>
            Làm sau
          </Button>
        </div>
      </div>
    </div>
  )
}
