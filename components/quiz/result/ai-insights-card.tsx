'use client'

import { useState, useTransition } from 'react'
import { Brain, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react'
import { analyzeSubmissionAction } from '@/app/actions/analyze-submission'
import type { AIAnalysis } from '@/app/actions/analyze-submission'
import { generateSmartQuizAction } from '@/app/actions/generate-smart-quiz'
import { TopicAnalyticsCard } from '@/components/quiz/result/topic-analytics-card'
import { PracticePreTestModal } from '@/components/quiz/practice-pretest-modal'
import { toast } from 'sonner'

interface AIInsightsCardProps {
  submissionId: string
  initialAnalysis: string | null
  /** When true (teacher view), hides the re-analyze button */
  readOnly?: boolean
}

function parseAnalysis(raw: string | null): AIAnalysis | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AIAnalysis
  } catch {
    return { praise: raw, knowledgeGaps: [] }
  }
}

export function AIInsightsCard({ submissionId, initialAnalysis, readOnly }: AIInsightsCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(parseAnalysis(initialAnalysis))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(!!analysis)
  const [isPracticing, startPractice] = useTransition()
  const [pretestOpen, setPretestOpen] = useState(false)
  const [pendingQuiz, setPendingQuiz] = useState<{
    testId: string
    questionCount: number
    timeLimitMinutes: number
    weakTopic: string
  } | null>(null)

  async function handleAnalyze() {
    setIsLoading(true)
    setError(null)
    const result = await analyzeSubmissionAction(submissionId)
    if (result.success && result.data) {
      setAnalysis(result.data)
      setIsExpanded(true)
    } else {
      setError(result.error ?? 'Không thể tạo phân tích')
    }
    setIsLoading(false)
  }

  function handlePracticeNow() {
    const topicKeys = analysis?.nextStep?.topicKeys
    const topicTitles = analysis?.nextStep?.topicTitles
    startPractice(async () => {
      const result = await generateSmartQuizAction({
        topicKeys,
        topicTitles,
      })
      if (result.success && result.data) {
        setPendingQuiz({
          testId: result.data.testId,
          questionCount: result.data.questionCount,
          timeLimitMinutes: result.data.timeLimitMinutes,
          weakTopic: result.data.weakTopic,
        })
        setPretestOpen(true)
      } else {
        toast.error(result.error ?? 'Chưa tạo được bài luyện')
      }
    })
  }

  const hasPracticeCta =
    !readOnly &&
    analysis?.nextStep?.type === 'practice' &&
    (analysis.nextStep.topicKeys.length > 0 || analysis.nextStep.topicTitles.length > 0)

  return (
    <>
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900 dark:bg-teal-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-teal-600" aria-hidden />
            <h2 className="font-semibold text-foreground">Phân tích & bước tiếp theo</h2>
          </div>

          <div className="flex items-center gap-2">
            {analysis && (
              <button
                type="button"
                onClick={() => setIsExpanded((e) => !e)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {isExpanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600/40 bg-background px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60 dark:text-teal-300 dark:hover:bg-teal-950"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Brain className="size-4" />
                )}
                {isLoading ? 'Đang phân tích...' : analysis ? 'Làm mới lời khuyên' : 'Tạo phân tích'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {!analysis && !isLoading && !readOnly && (
          <p className="mt-3 text-sm text-muted-foreground">
            Phân tích thường sẵn sau khi nộp bài. Nếu chưa thấy, bấm &quot;Tạo phân tích&quot;.
          </p>
        )}
        {!analysis && readOnly && (
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có phân tích cho bài này.
          </p>
        )}

        {analysis && isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-teal-200 bg-background/70 px-4 py-3 dark:border-teal-800">
              <p className="text-sm leading-relaxed text-foreground">{analysis.praise}</p>
            </div>

            {analysis.topicMastery && analysis.topicMastery.length > 0 && (
              <TopicAnalyticsCard topicMastery={analysis.topicMastery} withAdvice />
            )}

            {analysis.knowledgeGaps.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Điểm cần cải thiện
                </h3>
                <div className="space-y-2">
                  {analysis.knowledgeGaps.map((gap, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20"
                    >
                      <p className="text-sm font-medium text-foreground">{gap.issue}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{gap.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasPracticeCta && (
              <div className="rounded-xl border border-teal-300 bg-background px-4 py-4 dark:border-teal-800">
                <p className="text-sm font-medium text-foreground">
                  Bước tiếp theo: luyện{' '}
                  {analysis.nextStep!.topicTitles.slice(0, 2).join(', ')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hệ thống trộn câu từ kho đề theo điểm yếu — không sinh đề bằng AI.
                </p>
                <button
                  type="button"
                  onClick={handlePracticeNow}
                  disabled={isPracticing}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {isPracticing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BookOpen className="size-4" />
                  )}
                  {isPracticing ? 'Đang chuẩn bị…' : 'Luyện ngay'}
                </button>
              </div>
            )}

            {analysis.knowledgeGaps.length === 0 &&
              !analysis.topicMastery?.some((t) => t.status !== 'MASTERED') && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  Không phát hiện lỗ hổng kiến thức nghiêm trọng. Tiếp tục duy trì nhé!
                </p>
              )}
          </div>
        )}
      </div>

      {pendingQuiz ? (
        <PracticePreTestModal
          open={pretestOpen}
          onOpenChange={setPretestOpen}
          testId={pendingQuiz.testId}
          title={`Luyện tập — ${pendingQuiz.weakTopic}`}
          topic={pendingQuiz.weakTopic}
          questionCount={pendingQuiz.questionCount}
          timeLimitMinutes={pendingQuiz.timeLimitMinutes}
        />
      ) : null}
    </>
  )
}
