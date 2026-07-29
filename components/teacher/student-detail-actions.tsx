'use client'

import { useState } from 'react'
import { Brain, Copy, Check, FileText, Loader2, X, HelpCircle, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generateStudentFeedbackAction,
  generatePersonalizedQuizAction,
  type GeneratedQuizQuestion,
} from '@/app/actions/teacher-student-ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudentDetailActionsProps {
  studentName: string
  avgScore: number
  weakTopics: string[]
  behaviorSignals: string[]
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative mt-16 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feedback modal content
// ---------------------------------------------------------------------------

function FeedbackModalContent({
  studentName,
  avgScore,
  weakTopics,
  behaviorSignals,
}: {
  studentName: string
  avgScore: number
  weakTopics: string[]
  behaviorSignals: string[]
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const res = await generateStudentFeedbackAction({
      studentName,
      avgScore,
      weakTopics,
      behaviorSignals,
    })
    setLoading(false)
    if (res.ok) setMessage(res.message)
    else setError(res.error)
  }

  async function handleCopy() {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI sẽ soạn một tin nhắn nhẹ nhàng, xây dựng để gửi cho phụ huynh hoặc học sinh về tình
        hình học tập của <strong>{studentName}</strong>.
      </p>

      {!message && !loading && (
        <Button onClick={handleGenerate} className="gap-2">
          <Brain className="size-4" />
          Soạn nhận xét với AI
        </Button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang soạn nhận xét...
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {message && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              {copied ? 'Đã sao chép!' : 'Sao chép'}
            </Button>
            <Button variant="ghost" onClick={handleGenerate} className="gap-2 text-muted-foreground">
              <Brain className="size-4" /> Soạn lại
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quiz modal content
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  SHORT_ANSWER: 'Tự luận ngắn',
}
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function QuizModalContent({
  studentName,
  weakTopics,
}: {
  studentName: string
  weakTopics: string[]
}) {
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<GeneratedQuizQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const res = await generatePersonalizedQuizAction({ studentName, weakTopics })
    setLoading(false)
    if (res.ok) setQuestions(res.questions)
    else setError(res.error)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI sẽ tạo <strong>5 câu hỏi</strong> nhắm thẳng vào các chủ đề yếu của{' '}
        <strong>{studentName}</strong>:{' '}
        <span className="text-foreground">{weakTopics.slice(0, 3).join(', ')}{weakTopics.length > 3 ? '...' : ''}</span>
      </p>

      {!questions && !loading && (
        <Button onClick={handleGenerate} className="gap-2">
          <Brain className="size-4" />
          Tạo bài tập phụ đạo
        </Button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tạo bài tập...
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {questions && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id ?? i} className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Câu {i + 1} — {q.topic}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {TYPE_LABEL[q.type] ?? q.type}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{q.points} điểm</span>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground">{q.content}</p>
              {q.type === 'MULTIPLE_CHOICE' && q.options && (
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, oi) => (
                    <li
                      key={opt.id ?? oi}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                        oi === Number(q.correctAnswer)
                          ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold">{OPTION_LABELS[oi]}</span>
                      {opt.content}
                      {oi === Number(q.correctAnswer) && (
                        <span className="ml-auto text-xs text-green-600">✓ Đáp án</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {q.type === 'SHORT_ANSWER' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Đáp án: <span className="font-medium text-green-700">{String(q.correctAnswer)}</span>
                </p>
              )}
              {q.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={handleGenerate}
            className="gap-2 text-muted-foreground"
          >
            <Brain className="size-4" /> Tạo lại
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function StudentDetailActions({
  studentName,
  avgScore,
  weakTopics,
  behaviorSignals,
}: StudentDetailActionsProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => setFeedbackOpen(true)}
        >
          <FileText className="size-4" />
          Soạn nhận xét gửi Phụ huynh
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={weakTopics.length === 0}
          onClick={() => setQuizOpen(true)}
        >
          <HelpCircle className="size-4" />
          Tạo bài tập phụ đạo riêng (1-click)
        </Button>
      </div>

      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Soạn nhận xét gửi Phụ huynh / Học sinh"
      >
        <FeedbackModalContent
          studentName={studentName}
          avgScore={avgScore}
          weakTopics={weakTopics}
          behaviorSignals={behaviorSignals}
        />
      </Modal>

      <Modal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        title="Bài tập phụ đạo cá nhân hóa (AI)"
      >
        <QuizModalContent studentName={studentName} weakTopics={weakTopics} />
      </Modal>
    </>
  )
}
