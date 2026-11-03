'use client'

import { useRouter } from 'next/navigation'
import { Clock, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
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
    router.push('/quizzes?tab=later')
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          Sẵn sàng luyện tập
        </span>
      }
      panelClassName="max-w-md rounded-2xl border-border bg-card"
      className="backdrop-blur-sm"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Câu hỏi lấy từ kho đề theo điểm yếu — không sinh đề mới.
      </p>

      <div className="mb-5 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">{title}</p>
        <div className="flex flex-wrap gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {timeLimitMinutes} phút
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-3.5" aria-hidden />
            {questionCount} câu hỏi
          </span>
        </div>
        <p>
          Chủ đề ôn tập: <strong className="text-foreground">{topic}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button className="w-full" onClick={handleStart} data-dialog-initial-focus>
          Bắt đầu làm bài
        </Button>
        <Button variant="outline" className="w-full" onClick={handleSaveLater}>
          Lưu vào &quot;Làm sau&quot;
        </Button>
      </div>
    </AccessibleDialog>
  )
}
