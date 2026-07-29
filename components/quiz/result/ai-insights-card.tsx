'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { analyzeSubmissionAction } from '@/app/actions/analyze-submission'
import type { AIAnalysis } from '@/app/actions/analyze-submission'
import { TopicAnalyticsCard } from '@/components/quiz/result/topic-analytics-card'

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

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5 dark:border-purple-900 dark:bg-purple-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-purple-600" aria-hidden />
          <h2 className="font-semibold text-foreground">Phân tích AI cá nhân hóa</h2>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Brain className="size-4" />
              )}
              {isLoading ? 'Đang phân tích...' : analysis ? 'Phân tích lại' : 'Xem AI Phân Tích'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {analysis && isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Praise */}
          <div className="rounded-xl border border-purple-200 bg-background/70 px-4 py-3 dark:border-purple-800">
            <p className="text-sm leading-relaxed text-foreground">{analysis.praise}</p>
          </div>

          {/* Topic mastery with AI advice */}
          {analysis.topicMastery && analysis.topicMastery.length > 0 && (
            <TopicAnalyticsCard topicMastery={analysis.topicMastery} withAdvice />
          )}

          {/* Knowledge Gaps */}
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

          {analysis.knowledgeGaps.length === 0 && !analysis.topicMastery?.some((t) => t.status !== 'MASTERED') && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Không phát hiện lỗ hổng kiến thức nghiêm trọng. Tiếp tục duy trì nhé!
            </p>
          )}
        </div>
      )}

      {!analysis && !isLoading && !readOnly && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nhấn "Xem AI Phân Tích" để nhận phân tích cá nhân hóa về kết quả bài làm.
        </p>
      )}
      {!analysis && readOnly && (
        <p className="mt-3 text-sm text-muted-foreground">
          Học sinh chưa chạy phân tích AI cho bài này.
        </p>
      )}
    </div>
  )
}
