'use client'

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
  const mastered = states.filter((s) => s.pMastery >= 0.8)
  const progressing = states.filter((s) => s.pMastery >= 0.5 && s.pMastery < 0.8)
  const weak = states.filter((s) => s.pMastery < 0.5)

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
      <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-5 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
              <MapIcon className="size-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Bản đồ Tri thức
              </h1>
              <p className="text-sm text-slate-500">
                {states.length} chủ đề · Thành thạo tổng thể{' '}
                <span className="font-semibold text-indigo-600">{overallMastery}%</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <SummaryPill icon={CheckCircle2} tone="emerald" label={`${mastered.length} thành thạo`} />
            <SummaryPill icon={TrendingUp} tone="amber" label={`${progressing.length} đang tiến`} />
            <SummaryPill icon={AlertCircle} tone="rose" label={`${weak.length} cần ôn`} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <span>Tiến độ tổng thể</span>
            <span>{overallMastery}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${overallMastery}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strengths first — positive framing */}
      {topStrengths.length > 0 && (
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Điểm mạnh của bạn
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {topStrengths.map((s) => (
              <div
                key={s.nodeId}
                className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-white/70 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {s.title}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
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
              const clusterMastered = cluster.states.filter((s) => s.pMastery >= 0.8).length
              const clusterWeak = cluster.states.filter((s) => s.pMastery < 0.5).length

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
              <CardDescription>Bạn đã nắm phần nền — luyện thêm để thành thạo</CardDescription>
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
                <CardDescription>Zeno sẽ gợi ý bài phù hợp — không sao cả, mọi người đều cần ôn!</CardDescription>
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
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="mb-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
            Nhật ký học tập của Zeno
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {zenoSummary.split('\n').at(-1)?.trim()}
          </p>
          {zenoUpdatedAt && (
            <p className="mt-1.5 text-xs text-slate-400">
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
    MASTERED: 'bg-emerald-500',
    PROGRESSING: 'bg-amber-400',
    GAP: 'bg-rose-400',
  }[status]

  const statusIcon = {
    MASTERED: CheckCircle2,
    PROGRESSING: TrendingUp,
    GAP: AlertCircle,
  }[status]

  const StatusIcon = statusIcon

  return (
    <div className={cn('rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-800/40', compact && 'py-1.5')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className={cn('font-medium text-slate-700 dark:text-slate-300', compact ? 'text-xs' : 'text-sm')}>
          {state.title}
        </p>
        <Badge variant="outline" className="gap-0.5 text-[10px]">
          <StatusIcon className="size-2.5" />
          {masteryStatusLabel(status)}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${mastery}%` }} />
        </div>
        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-500">{mastery}%</span>
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
  tone: 'emerald' | 'amber' | 'rose'
  label: string
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium', tones[tone])}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

function EmptyRoadmap() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
      <MapIcon className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
      <p className="mt-4 font-medium text-slate-500">Bản đồ tri thức chưa có dữ liệu</p>
      <p className="mt-1 text-sm text-slate-400">
        Hoàn thành ít nhất một bài kiểm tra để Zeno bắt đầu lập bản đồ kiến thức của bạn.
      </p>
    </div>
  )
}
