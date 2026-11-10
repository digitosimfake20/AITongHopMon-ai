'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addSavedPractice } from '@/lib/quiz/active-quiz-session'
import {
  recordConsentAction,
  startMonitoredAttemptAction,
  type ConsentDecision,
} from '@/app/actions/anticheat'
import {
  getMonitoredAttemptId,
  getMonitoredConsentOutcome,
  setMonitoredAttemptId,
  setMonitoredConsentOutcome,
} from '@/components/quiz/anticheat-attempt-session'

interface QuizPreTestGateProps {
  data: {
    testId: string
    title: string
    timeLimitMinutes: number
    questionCount: number
    topic?: string
    isPersonalPractice?: boolean
    monitoringEnabled?: boolean
    classTestId?: string
  }
  children: React.ReactNode
}

export function QuizPreTestGate({ data, children }: QuizPreTestGateProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const wantsStart =
    searchParams.get('start') === '1' || searchParams.get('resume') === '1'
  const monitoring = Boolean(data.monitoringEnabled)

  // Consent must be recorded — attempt id alone is not enough (start can succeed
  // while recordConsent fails / is skipped).
  const [hasConsent, setHasConsent] = useState(() =>
    monitoring ? Boolean(getMonitoredConsentOutcome(data.testId)) : true,
  )
  const [isPending, startTransition] = useTransition()
  const [consentBusy, setConsentBusy] = useState<ConsentDecision | null>(null)

  useEffect(() => {
    if (!monitoring) {
      setHasConsent(true)
      return
    }
    setHasConsent(Boolean(getMonitoredConsentOutcome(data.testId)))
  }, [monitoring, data.testId])

  const canEnterQuiz = wantsStart && (!monitoring || hasConsent)

  if (canEnterQuiz) {
    return <>{children}</>
  }

  function beginQuiz() {
    router.push(`/quiz/take/${data.testId}?start=1`)
  }

  function handleConsentAndStart(decision: ConsentDecision) {
    setConsentBusy(decision)
    startTransition(async () => {
      try {
        let attemptId = getMonitoredAttemptId(data.testId)
        if (!attemptId) {
          const started = await startMonitoredAttemptAction({
            testId: data.testId,
            classTestId: data.classTestId,
          })
          if (!started.success || !started.data?.attemptId) {
            toast.error(started.error ?? 'Không thể bắt đầu phiên giám sát')
            setConsentBusy(null)
            return
          }
          attemptId = started.data.attemptId
          setMonitoredAttemptId(data.testId, attemptId)
        }

        const consent = await recordConsentAction({ attemptId, decision })
        if (!consent.success) {
          toast.error(consent.error ?? 'Không ghi nhận được lựa chọn đồng ý')
          setConsentBusy(null)
          return
        }

        setMonitoredConsentOutcome(data.testId, decision)
        setHasConsent(true)

        if (decision === 'refused') {
          toast.message('Đã ghi nhận từ chối giám sát', {
            description: 'Bạn vẫn có thể làm bài; giáo viên sẽ xem lại sau.',
          })
        }

        beginQuiz()
      } catch {
        toast.error('Không thể tiếp tục. Vui lòng thử lại.')
        setConsentBusy(null)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-lg">
        <div className="text-center">
          <Sparkles className="mx-auto size-10 text-primary" aria-hidden />
          <h1 className="mt-3 text-xl font-bold text-card-foreground">Sẵn sàng làm bài</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.title}</p>
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thời gian</span>
            <span className="font-medium">{data.timeLimitMinutes} phút</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số câu hỏi</span>
            <span className="font-medium">{data.questionCount}</span>
          </div>
          {data.topic ? (
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Chủ đề</span>
              <span className="text-right font-medium">{data.topic}</span>
            </div>
          ) : null}
        </div>

        {monitoring ? (
          <section
            className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900 dark:bg-sky-950/30"
            aria-labelledby="anticheat-consent-title"
          >
            <div className="flex items-start gap-2">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300"
                aria-hidden
              />
              <div>
                <h2
                  id="anticheat-consent-title"
                  className="text-sm font-semibold text-sky-900 dark:text-sky-100"
                >
                  Bài được giám sát nhẹ
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sky-800/90 dark:text-sky-200/90">
                  Hệ thống có thể ghi nhận khi bạn rời trang làm bài (ví dụ chuyển tab) để giáo viên
                  xem lại sau. Điểm số không bị hủy tự động. Bạn có thể đồng ý hoặc từ chối giám sát
                  và vẫn bắt đầu làm bài.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={isPending}
                onClick={() => handleConsentAndStart('granted')}
              >
                {consentBusy === 'granted' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Đồng ý và bắt đầu
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={isPending}
                onClick={() => handleConsentAndStart('refused')}
              >
                {consentBusy === 'refused' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Từ chối giám sát — vẫn làm bài
              </Button>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/quiz/take/${data.testId}?start=1`} />}
            >
              Bắt đầu làm bài
            </Button>
            {data.isPersonalPractice ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  addSavedPractice({
                    testId: data.testId,
                    title: data.title,
                    topic: data.topic ?? 'Ôn tập',
                    questionCount: data.questionCount,
                    timeLimitMinutes: data.timeLimitMinutes,
                    savedAt: Date.now(),
                  })
                  router.push('/quizzes?tab=later')
                }}
              >
                Lưu vào &quot;Làm sau&quot;
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
