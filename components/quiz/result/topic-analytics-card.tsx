'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, Lightbulb, BarChart2 } from 'lucide-react'
import type { TopicMastery } from '@/app/actions/analyze-submission'

// ---------------------------------------------------------------------------
// Status config — icons only, no window emojis
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  WEAK: {
    Icon: AlertCircle,
    iconClass: 'text-red-500',
    label: 'Yếu',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  MEDIUM: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
    label: 'Cần luyện thêm',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  MASTERED: {
    Icon: CheckCircle2,
    iconClass: 'text-green-500',
    label: 'Thành thạo',
    bar: 'bg-green-500',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
} as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TopicAnalyticsCardProps {
  topicMastery: TopicMastery[]
  /** If provided, shows AI-generated advice per topic (from analyzeSubmissionAction) */
  withAdvice?: boolean
}

export function TopicAnalyticsCard({ topicMastery, withAdvice }: TopicAnalyticsCardProps) {
  if (topicMastery.length === 0) return null

  return (
    <section
      aria-label="Phân tích theo chủ đề"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-card-foreground">
        <BarChart2 className="size-4 text-primary" aria-hidden />
        Phân tích theo Chủ đề
      </h2>

      <ul className="space-y-3">
        {topicMastery.map((t) => {
          const cfg = STATUS_CONFIG[t.status]
          const { Icon } = cfg
          return (
            <li key={t.topic} className={`rounded-xl border p-3 ${cfg.border} bg-background`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{t.topic}</p>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                  <Icon className={`size-3 ${cfg.iconClass}`} aria-hidden />
                  {cfg.label} — Sai {t.total - t.correct}/{t.total} câu
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-mono text-muted-foreground">
                  {t.accuracy}%
                </span>
              </div>

              {/* AI advice for weak/medium topics */}
              {withAdvice && t.advice && t.status !== 'MASTERED' && (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-3 shrink-0 text-amber-500" aria-hidden />
                  {t.advice}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
