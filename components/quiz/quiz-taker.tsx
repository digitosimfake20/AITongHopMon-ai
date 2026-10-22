'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock, Loader2, Send } from 'lucide-react'
import { MathText } from '@/components/quiz/math-text'
import { submitQuizAction } from '@/app/actions/quiz-submission'
import type { QuizTakingData, QuizTakingQuestion } from '@/lib/quiz/quiz-bank-queries'
import {
  clearActiveQuizSession,
  getActiveQuizSession,
  getRemainingSeconds,
  patchActiveQuizAnswers,
  startActiveQuizSession,
} from '@/lib/quiz/active-quiz-session'
import { resolveElapsedSeconds } from '@/lib/quiz/quiz-elapsed'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MCAnswer = string                             // 'A' | 'B' | 'C' | 'D'
type TFAnswer = Record<string, boolean>            // { a: true, b: false, ... }
type TextAnswer = string                           // SHORT_ANSWER | ESSAY

type QuizAnswer = MCAnswer | TFAnswer | TextAnswer

interface AnswerMap {
  [questionId: string]: {
    type: QuizTakingQuestion['type']
    value: QuizAnswer
  }
}

// ---------------------------------------------------------------------------
// Timer hook
// ---------------------------------------------------------------------------

function useWallClockTimer(
  timeLimitMinutes: number,
  startedAt: number | null,
  onExpire: () => void,
) {
  const totalSeconds = timeLimitMinutes * 60
  const computeRemaining = useCallback(() => {
    if (!startedAt) return totalSeconds
    return getRemainingSeconds({
      testId: '',
      testTitle: '',
      startedAt,
      timeLimitMinutes,
      answers: {},
    })
  }, [startedAt, timeLimitMinutes, totalSeconds])

  const [remaining, setRemaining] = useState(() => computeRemaining())
  const cbRef = useRef(onExpire)
  cbRef.current = onExpire
  const expiredRef = useRef(false)

  useEffect(() => {
    setRemaining(computeRemaining())
    expiredRef.current = false
  }, [computeRemaining, startedAt])

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => {
      const next = computeRemaining()
      setRemaining(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        cbRef.current()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt, computeRemaining])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return { remaining, display: `${mm}:${ss}`, isWarning: remaining <= 120 }
}

// ---------------------------------------------------------------------------
// Per-question answer editors
// ---------------------------------------------------------------------------

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function MCEditor({
  question,
  answer,
  onChange,
}: {
  question: QuizTakingQuestion
  answer: string | undefined
  onChange: (v: string) => void
}) {
  const options = question.options ?? []
  return (
    <div className="mt-4 space-y-2">
      {options.map((opt, i) => {
        const label = OPTION_LABELS[i]
        const selected = answer === label
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(label)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
            >
              {label}
            </span>
            <MathText text={opt} />
          </button>
        )
      })}
    </div>
  )
}

function TFEditor({
  question,
  answer,
  onChange,
}: {
  question: QuizTakingQuestion
  answer: TFAnswer | undefined
  onChange: (v: TFAnswer) => void
}) {
  const stmts = question.subStatements ?? []
  return (
    <div className="mt-4 space-y-2">
      {stmts.map((stmt) => {
        const val = answer?.[stmt.label]
        return (
          <div
            key={stmt.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
          >
            <span className="w-5 shrink-0 font-mono text-sm font-bold text-muted-foreground">
              {stmt.label})
            </span>
            <span className="flex-1 text-sm">
              <MathText text={stmt.content} />
            </span>
            <div className="flex shrink-0 gap-1 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => onChange({ ...answer, [stmt.label]: true })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  val === true
                    ? 'bg-green-600 text-white'
                    : 'text-muted-foreground hover:bg-background',
                )}
              >
                Đúng
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...answer, [stmt.label]: false })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  val === false
                    ? 'bg-red-600 text-white'
                    : 'text-muted-foreground hover:bg-background',
                )}
              >
                Sai
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TextEditor({
  multiline,
  value,
  placeholder,
  onChange,
}: {
  multiline: boolean
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-4 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  )
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  answer,
  onChange,
}: {
  question: QuizTakingQuestion
  index: number
  answer: { type: QuizTakingQuestion['type']; value: QuizAnswer } | undefined
  onChange: (type: QuizTakingQuestion['type'], value: QuizAnswer) => void
}) {
  const isAnswered = !!answer

  return (
    <div
      id={`q-${question.id}`}
      className={cn(
        'rounded-2xl border p-5 transition-colors',
        isAnswered ? 'border-primary/30 bg-card' : 'border-border bg-card',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-foreground">
          {isAnswered && <CheckCircle2 className="size-3.5 text-primary" />}
          Câu {index + 1}
        </span>
        <span className="text-xs text-muted-foreground">{question.points} điểm</span>
      </div>

      {/* Content */}
      <div className="mt-3 text-sm text-foreground leading-relaxed">
        <MathText text={question.content} />
      </div>

      {/* Answer editor */}
      {question.type === 'MULTIPLE_CHOICE' && (
        <MCEditor
          question={question}
          answer={answer?.value as string | undefined}
          onChange={(v) => onChange('MULTIPLE_CHOICE', v)}
        />
      )}
      {question.type === 'TRUE_FALSE_GROUP' && (
        <TFEditor
          question={question}
          answer={answer?.value as TFAnswer | undefined}
          onChange={(v) => onChange('TRUE_FALSE_GROUP', v)}
        />
      )}
      {question.type === 'SHORT_ANSWER' && (
        <TextEditor
          multiline={false}
          value={(answer?.value as string) ?? ''}
          placeholder="Nhập đáp án..."
          onChange={(v) => onChange('SHORT_ANSWER', v)}
        />
      )}
      {question.type === 'ESSAY' && (
        <TextEditor
          multiline
          value={(answer?.value as string) ?? ''}
          placeholder="Viết bài làm tại đây..."
          onChange={(v) => onChange('ESSAY', v)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmSubmitDialog({
  answeredCount,
  totalCount,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  answeredCount: number
  totalCount: number
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const unanswered = totalCount - answeredCount
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground">Xác nhận nộp bài</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn đã trả lời <strong>{answeredCount}/{totalCount}</strong> câu hỏi.
          {unanswered > 0 && (
            <span className="ml-1 text-amber-600">
              Còn {unanswered} câu chưa làm.
            </span>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            Làm tiếp
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmittingOverlay() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">Đang chấm và nộp bài...</p>
        <p className="mt-1 text-sm text-muted-foreground">Vui lòng không đóng trang</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main QuizTaker
// ---------------------------------------------------------------------------

interface QuizTakerProps {
  data: QuizTakingData
}

export function QuizTaker({ data }: QuizTakerProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitLock = useRef(false)

  const interactionStart = useRef<Record<string, number>>({})
  const interactionEnd = useRef<Record<string, number>>({})
  const startedAtRef = useRef<number | null>(null)

  const totalSeconds = data.timeLimitMinutes * 60

  useEffect(() => {
    let session = getActiveQuizSession()
    if (!session || session.testId !== data.testId) {
      session = startActiveQuizSession(data.testId, data.title, data.timeLimitMinutes)
    }
    startedAtRef.current = session.startedAt
    setStartedAt(session.startedAt)
    if (session.answers && Object.keys(session.answers).length > 0) {
      setAnswers(session.answers as AnswerMap)
    }
  }, [data.testId, data.title, data.timeLimitMinutes])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isSubmitting && startedAt) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isSubmitting, startedAt])

  const doSubmit = useCallback(async () => {
    if (submitLock.current) return
    submitLock.current = true
    setIsSubmitting(true)
    setShowConfirm(false)
    setError(null)

    const startedAtMs = startedAtRef.current ?? getActiveQuizSession()?.startedAt ?? null
    const elapsed = resolveElapsedSeconds({
      startedAtMs,
      nowMs: Date.now(),
      timeLimitSeconds: totalSeconds,
    })

    const answerList = data.questions.map((q) => {
      const a = answers[q.id]
      const measured = getTimeSpent(q.id)
      return {
        questionId: q.id,
        questionType: q.type as Parameters<typeof submitQuizAction>[0]['answers'][number]['questionType'],
        answer: a?.value ?? (q.type === 'TRUE_FALSE_GROUP' ? {} : ''),
        timeSpentSeconds: measured > 0 ? measured : 0,
      }
    })

    try {
      const result = await submitQuizAction({
        testId: data.testId,
        totalTimeSpentSeconds: elapsed.seconds,
        clientStartedAtMs: startedAtMs,
        answers: answerList,
      })

      if (result.success && result.data) {
        clearActiveQuizSession(data.testId)
        window.location.assign(`/quiz/result/${result.data.submissionId}`)
        return
      }

      submitLock.current = false
      setError(result.error ?? 'Không thể nộp bài. Vui lòng thử lại.')
      setIsSubmitting(false)
    } catch {
      submitLock.current = false
      setError('Không thể nộp bài. Vui lòng thử lại.')
      setIsSubmitting(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, data, totalSeconds])

  const handleExpire = useCallback(() => {
    setShowConfirm(false)
    void doSubmit()
  }, [doSubmit])

  const { remaining, display, isWarning } = useWallClockTimer(
    data.timeLimitMinutes,
    startedAt,
    handleExpire,
  )

  function handleAnswer(questionId: string, type: QuizTakingQuestion['type'], value: QuizAnswer) {
    const now = Date.now()
    if (!(questionId in interactionStart.current)) {
      interactionStart.current[questionId] = now
    }
    interactionEnd.current[questionId] = now
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { type, value } }
      patchActiveQuizAnswers(data.testId, next)
      return next
    })
  }

  function getTimeSpent(questionId: string): number {
    const start = interactionStart.current[questionId]
    const end = interactionEnd.current[questionId]
    if (!start) return 0
    return Math.round(((end ?? Date.now()) - start) / 1000)
  }

  const answeredCount = data.questions.filter((q) => answers[q.id] !== undefined).length

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="mb-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Quay lại
            </button>
            <h1 className="truncate text-sm font-semibold text-foreground">{data.title}</h1>
            <p className="text-xs text-muted-foreground">
              Đã trả lời {answeredCount}/{data.questions.length} câu
            </p>
          </div>

          <div
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-sm font-bold tabular-nums',
              isWarning
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
                : 'border-border bg-background text-foreground',
            )}
          >
            <Clock className={cn('size-3.5', isWarning && 'text-red-600')} aria-hidden />
            {display}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${(answeredCount / data.questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Question list */}
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {data.questions.map((question, i) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={i}
            answer={answers[question.id]}
            onChange={(type, value) => handleAnswer(question.id, type, value)}
          />
        ))}

        {/* Spacer so button doesn't cover last question */}
        <div className="h-24" />
      </main>

      {/* Sticky submit button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {answeredCount < data.questions.length
              ? `Còn ${data.questions.length - answeredCount} câu chưa làm`
              : 'Tất cả câu đã được trả lời ✓'}
          </p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="size-4" />
            Nộp bài
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmSubmitDialog
          answeredCount={answeredCount}
          totalCount={data.questions.length}
          onConfirm={() => void doSubmit()}
          onCancel={() => setShowConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {isSubmitting && <SubmittingOverlay />}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Đang làm bài</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn đang trong tiến trình làm bài. Thời gian vẫn tiếp tục trôi. Bạn có muốn tiếp tục làm không?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false)
                  router.push('/dashboard')
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Về Dashboard
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Tiếp tục làm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
