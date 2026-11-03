'use client'

import Link from 'next/link'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Map as MapIcon,
  TrendingUp,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getTopicClusterDef,
  inferTopicCluster,
  masteryStatusLabel,
  type MasteryStatus,
} from '@/lib/knowledge/topic-clusters'
import {
  MASTERY_STATUS_MASTERED,
  MASTERY_STATUS_PROGRESSING,
} from '@/lib/knowledge/mastery-labels'
import { cn } from '@/lib/utils'

export interface KnowledgeStateItem {
  nodeId: string
  pMastery: number
  title: string
  subject: string
  lastPracticedAt: Date | null
}

interface KnowledgeRoadmapProps {
  states: KnowledgeStateItem[]
  overallMastery: number
  zenoSummary?: string | null
  zenoUpdatedAt?: Date | null
}

type ClusterBucket = {
  clusterId: string
  label: string
  states: KnowledgeStateItem[]
  avgMastery: number
}

export function KnowledgeRoadmap({
  states,
  overallMastery,
  zenoSummary,
  zenoUpdatedAt,
}: KnowledgeRoadmapProps) {
  const mastered = states.filter((s) => s.pMastery >= MASTERY_STATUS_MASTERED)
  const progressing = states.filter(
    (s) =>
      s.pMastery >= MASTERY_STATUS_PROGRESSING && s.pMastery < MASTERY_STATUS_MASTERED,
  )
  const weak = states.filter((s) => s.pMastery < MASTERY_STATUS_PROGRESSING)

  const topStrengths = [...mastered]
    .sort((a, b) => b.pMastery - a.pMastery)
    .slice(0, 4)

  const clusterMap = new Map<string, KnowledgeStateItem[]>()
  for (const state of states) {
    const clusterId = inferTopicCluster(state.title)
    if (!clusterMap.has(clusterId)) clusterMap.set(clusterId, [])
    clusterMap.get(clusterId)!.push(state)
  }

  const clusters: ClusterBucket[] = [...clusterMap.entries()]
    .map(([clusterId, clusterStates]) => ({
      clusterId,
      label: getTopicClusterDef(clusterId).label,
      states: clusterStates.sort((a, b) => b.pMastery - a.pMastery),
      avgMastery: Math.round(
        (clusterStates.reduce((s, x) => s + x.pMastery, 0) / clusterStates.length) * 100,
      ),
    }))
    .sort((a, b) => b.avgMastery - a.avgMastery)

  const defaultOpen = clusters.slice(0, 1).map((c) => c.clusterId)

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
              <MapIcon className="size-5 text-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Bản đồ tri thức
              </h1>
              <p className="text-sm text-muted-foreground">
                {states.length} chủ đề · Thành thạo tổng thể{' '}
                <span className="font-semibold tabular-nums text-foreground">{overallMastery}%</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <SummaryPill icon={CheckCircle2} tone="success" label={`${mastered.length} thành thạo`} />
            <SummaryPill icon={TrendingUp} tone="warning" label={`${progressing.length} đang tiến`} />
            <SummaryPill icon={AlertCircle} tone="danger" label={`${weak.length} cần ôn`} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Tiến độ tổng thể</span>
            <span>{overallMastery}%</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={overallMastery}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ tổng thể"
          >
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${overallMastery}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strengths first — positive framing */}
      {topStrengths.length > 0 && (
        <section className="rounded-xl border border-success/25 bg-success/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-4 text-success" aria-hidden />
            <h2 className="text-sm font-semibold text-success">
              Điểm mạnh của bạn
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {topStrengths.map((s) => (
              <div
                key={s.nodeId}
                className="flex items-center justify-between rounded-lg border border-success/20 bg-card px-3 py-2"
              >
                <span className="text-sm font-medium text-foreground">
                  {s.title}
                </span>
                <Badge
                  variant="outline"
                  className="border-success/40 text-success"
                >
                  {Math.round(s.pMastery * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clustered accordion */}
      {clusters.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Kiến thức theo cụm
          </h2>
          <Accordion defaultValue={defaultOpen} className="gap-3">
            {clusters.map((cluster) => {
              const ClusterIcon = getTopicClusterDef(cluster.clusterId).icon
              const clusterMastered = cluster.states.filter(
                (s) => s.pMastery >= MASTERY_STATUS_MASTERED,
              ).length
              const clusterWeak = cluster.states.filter(
                (s) => s.pMastery < MASTERY_STATUS_PROGRESSING,
              ).length

              return (
                <AccordionItem
                  key={cluster.clusterId}
                  value={cluster.clusterId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-card px-4 dark:border-slate-700"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <ClusterIcon className="size-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {cluster.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cluster.states.length} chủ đề · TB {cluster.avgMastery}%
                          {clusterMastered > 0 && (
                            <span className="text-emerald-600"> · {clusterMastered} giỏi</span>
                          )}
                          {clusterWeak > 0 && (
                            <span className="text-rose-600"> · {clusterWeak} cần ôn</span>
                          )}
                        </p>
                      </div>
                      <div className="hidden w-24 sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${cluster.avgMastery}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {cluster.states.map((state) => (
                        <TopicRow key={state.nodeId} state={state} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </section>
      ) : (
        <EmptyRoadmap />
      )}

      {/* Progress encouragement cards */}
      {progressing.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          <Card size="sm" className="border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4 text-amber-600" />
                Đang tiến bộ
              </CardTitle>
              <CardDescription>Đã nắm phần nền; luyện thêm để thành thạo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {progressing.slice(0, 3).map((s) => (
                <TopicRow key={s.nodeId} state={s} compact />
              ))}
            </CardContent>
          </Card>

          {weak.length > 0 && (
            <Card size="sm" className="border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertCircle className="size-4 text-rose-600" />
                  Ưu tiên ôn tập
                </CardTitle>
                <CardDescription>Ưu tiên các chủ đề này trước khi làm bài mới</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weak.slice(0, 3).map((s) => (
                  <TopicRow key={s.nodeId} state={s} compact />
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {zenoSummary && (
        <div className="rounded-xl border border-zeno/25 bg-zeno/10 p-4">
          <p className="mb-1 text-xs font-semibold text-zeno">
            Nhật ký học tập của Zeno
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {zenoSummary.split('\n').at(-1)?.trim()}
          </p>
          {zenoUpdatedAt && (
            <p className="mt-1.5 text-xs text-muted-foreground/80">
              Cập nhật: {new Date(zenoUpdatedAt).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TopicRow({ state, compact }: { state: KnowledgeStateItem; compact?: boolean }) {
  const mastery = Math.round(state.pMastery * 100)
  const status: MasteryStatus =
    mastery >= 80 ? 'MASTERED' : mastery >= 50 ? 'PROGRESSING' : 'GAP'

  const barColor = {
    MASTERED: 'bg-success',
    PROGRESSING: 'bg-warning',
    GAP: 'bg-destructive',
  }[status]

  const statusIcon = {
    MASTERED: CheckCircle2,
    PROGRESSING: TrendingUp,
    GAP: AlertCircle,
  }[status]

  const StatusIcon = statusIcon

  return (
    <div className={cn('rounded-lg bg-secondary/50 px-3 py-2', compact && 'py-1.5')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {state.title}
        </p>
        <Badge variant="outline" className="gap-0.5 text-[10px]">
          <StatusIcon className="size-2.5" />
          {masteryStatusLabel(status)}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${mastery}%` }} />
        </div>
        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">{mastery}%</span>
      </div>
    </div>
  )
}

function SummaryPill({
  icon: Icon,
  tone,
  label,
}: {
  icon: typeof CheckCircle2
  tone: 'success' | 'warning' | 'danger'
  label: string
}) {
  const tones = {
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium', tones[tone])}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

function EmptyRoadmap() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <MapIcon className="mx-auto size-12 text-muted-foreground/40" aria-hidden />
      <p className="mt-4 font-medium text-muted-foreground">Bản đồ tri thức chưa có dữ liệu</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Làm ít nhất một bài kiểm tra để Zeno lập bản đồ kiến thức của bạn.
      </p>
      <Link
        href="/quizzes"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-zeno px-4 text-sm font-medium text-white hover:opacity-90"
      >
        Xem đề kiểm tra
      </Link>
    </div>
  )
}
