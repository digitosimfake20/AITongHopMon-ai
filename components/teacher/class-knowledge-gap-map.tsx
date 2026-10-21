'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { generateRemedialSuggestionAction, type RemedialSuggestion } from '@/app/actions/teacher-ai'
import { MathText } from '@/components/quiz/math-text'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { withClassParam } from '@/lib/class/with-class-param'
import { masteryStatusLabel } from '@/lib/knowledge/topic-clusters'
import type { ClassGapMapData, CriticalGap, StudentTierGroup } from '@/lib/quiz/class-gap-map'
import { QUESTION_TYPE_LABELS } from '@/lib/quiz/types'
import { cn } from '@/lib/utils'

interface ClassKnowledgeGapMapProps {
  data: ClassGapMapData
  classId: string
}

export function ClassKnowledgeGapMap({ data, classId }: ClassKnowledgeGapMapProps) {
  const [selectedGap, setSelectedGap] = useState<CriticalGap | null>(null)
  const [expandedTier, setExpandedTier] = useState<StudentTierGroup['id'] | null>(null)

  const headerTitle = `BÁO CÁO LỖ HỔNG KIẾN THỨC — LỚP ${data.className.toUpperCase()}`

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-6 dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60">
              <Target className="size-5 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Class Knowledge Gap Map
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                {headerTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.subject} · Chủ đề trọng tâm:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {data.chapterHint}
                </span>
              </p>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {data.stats.aggregationNote}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Sĩ số"
            value={`${data.stats.studentCount} HS`}
            icon={<Users className="size-4 text-blue-600" />}
            tone="blue"
          />
          <StatCard
            label="Điểm TB lớp"
            value={data.stats.classAverage > 0 ? `${data.stats.classAverage}/10` : '—'}
            icon={<GraduationCap className="size-4 text-emerald-600" />}
            tone="emerald"
          />
          <StatCard
            label="Tỷ lệ hoàn thành"
            value={`${data.stats.completionRate}%`}
            hint={`${data.stats.completionDetail.completedSlots}/${data.stats.completionDetail.expectedSlots} HS×bài`}
            icon={<CheckCircle2 className="size-4 text-teal-600" />}
            tone="teal"
          />
          <StatCard
            label="HS cần chú ý"
            value={`${data.stats.needsAttentionCount} HS`}
            hint="Điểm TB bài kiểm tra < 5"
            icon={<AlertTriangle className="size-4 text-amber-600" />}
            tone="amber"
          />
        </div>
      </header>

      {/* Class strengths — positive framing */}
      {data.strengths.length > 0 && (
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Điểm mạnh chung của lớp
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.strengths.map((s) => (
              <Badge
                key={s.topic}
                variant="outline"
                className="border-emerald-300/60 bg-white/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <CheckCircle2 className="size-3" />
                {s.topic} · {s.masteryPercent}%
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Topic clusters overview */}
      {data.topicClusters.length > 0 && (
        <section>
          <SectionHeading
            icon={<BookOpen className="size-4" />}
            title="Tổng quan theo cụm kiến thức"
            subtitle="Nhóm chủ đề theo Đại số, Hình học… để dễ theo dõi"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.topicClusters.map((cluster) => (
              <Card key={cluster.clusterId} size="sm" className="ring-slate-200/80 dark:ring-slate-700/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{cluster.label}</CardTitle>
                  <CardDescription>{cluster.topicCount} chủ đề</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-2xl font-bold tabular-nums">{cluster.avgMastery}%</span>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <p className="text-emerald-600">{cluster.masteredTopics} tốt</p>
                      <p className="text-rose-600">{cluster.weakTopics} lỗ hổng</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-cyan-600 transition-all"
                      style={{ width: `${cluster.avgMastery}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Topic mastery table */}
      <section>
        <SectionHeading
          icon={<TrendingUp className="size-4" />}
          title="Tỷ lệ câu đúng theo chủ đề (mọi lượt làm)"
          subtitle="Không phải BKT trên hồ sơ học sinh — chỉ câu tự chấm, không gồm ESSAY"
        />
        {data.topicMastery.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu bài làm. Giao bài kiểm tra để lập bản đồ lỗ hổng." />
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                    <th className="px-4 py-3">Chủ đề / Dạng bài</th>
                    <th className="px-4 py-3">Cụm</th>
                    <th className="px-4 py-3 w-48">% câu đúng (lớp)</th>
                    <th className="px-4 py-3">Nhãn (theo % lượt)</th>
                    <th className="px-4 py-3 text-right">HS &lt;50% trên chủ đề</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topicMastery.map((row) => (
                    <tr
                      key={row.topic}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {row.topic}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {data.topicClusters.find((c) => c.clusterId === row.clusterId)?.label ??
                          'Khác'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 min-w-[100px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                row.status === 'MASTERED' && 'bg-emerald-500',
                                row.status === 'PROGRESSING' && 'bg-amber-400',
                                row.status === 'GAP' && 'bg-rose-500',
                              )}
                              style={{ width: `${row.masteryPercent}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold tabular-nums">
                            {row.masteryPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <MasteryBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        {row.weakStudentCount} HS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Critical gaps */}
      <section>
        <SectionHeading
          icon={<AlertTriangle className="size-4 text-rose-500" />}
          title="Lỗ hổng cấp thiết"
          subtitle="Theo từng câu hỏi (cùng chủ đề có thể có nhiều mục) — % = HS từng sai ≥1 lần"
        />
        {data.criticalGaps.length === 0 ? (
          <EmptyState message="Chưa phát hiện lỗ hổng cấp thiết. Lớp đang làm bài ổn định!" />
        ) : (
          <div className="mt-4 space-y-4">
            {data.criticalGaps.map((gap, idx) => (
              <CriticalGapCard
                key={gap.id}
                gap={gap}
                index={idx + 1}
                onShowStudents={() => setSelectedGap(gap)}
              />
            ))}
          </div>
        )}
      </section>

      {/* AI tier recommendations */}
      <section>
        <SectionHeading
          icon={<Sparkles className="size-4 text-teal-500" />}
          title="Phân nhóm & đề xuất AI"
          subtitle="Giao bài phù hợp từng nhóm — kèm điểm mạnh từng HS"
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {data.tierGroups.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              classId={classId}
              expanded={expandedTier === tier.id}
              onToggle={() =>
                setExpandedTier((v) => (v === tier.id ? null : tier.id))
              }
            />
          ))}
        </div>
      </section>

      {/* Student list modal */}
      {selectedGap && (
        <StudentListModal gap={selectedGap} onClose={() => setSelectedGap(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
        {icon}
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  tone: 'blue' | 'emerald' | 'teal' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30',
    teal: 'bg-teal-50 dark:bg-teal-950/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30',
  }
  return (
    <div className={cn('rounded-xl p-4', tones[tone])}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  )
}

function MasteryBadge({ status }: { status: 'MASTERED' | 'PROGRESSING' | 'GAP' }) {
  const config = {
    MASTERED: {
      icon: CheckCircle2,
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    PROGRESSING: {
      icon: TrendingUp,
      className:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    },
    GAP: {
      icon: AlertTriangle,
      className:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    },
  }[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      <Icon className="size-3" />
      {masteryStatusLabel(status)}
    </Badge>
  )
}

function CriticalGapCard({
  gap,
  index,
  onShowStudents,
}: {
  gap: CriticalGap
  index: number
  onShowStudents: () => void
}) {
  return (
    <article className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-200/80 text-xs font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {gap.title}{' '}
              <span className="font-normal text-rose-600 dark:text-rose-400">
                ({gap.wrongPercent}% HS từng sai ≥1 lần)
              </span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Chủ đề: {gap.topic} · {QUESTION_TYPE_LABELS[gap.questionType] ?? gap.questionType}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {gap.description}
            </p>
            <div className="mt-3 rounded-xl border border-rose-100 bg-white/80 px-4 py-3 dark:border-rose-900/30 dark:bg-slate-900/40">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Câu hỏi điển hình
              </p>
              <MathText text={gap.sampleQuestion} className="text-sm text-slate-800 dark:text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rose-200/50 pt-4 dark:border-rose-900/30">
        <AvatarGroup>
          {gap.affectedStudents.slice(0, 6).map((s) => (
            <Avatar key={s.id} size="sm" title={s.fullName}>
              <AvatarFallback className="text-[10px]">{s.initials}</AvatarFallback>
            </Avatar>
          ))}
          {gap.affectedStudents.length > 6 && (
            <AvatarGroupCount>+{gap.affectedStudents.length - 6}</AvatarGroupCount>
          )}
        </AvatarGroup>
        <Button size="sm" variant="outline" className="gap-1" onClick={onShowStudents}>
          Xem {gap.affectedStudents.length} HS
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </article>
  )
}

function TierCard({
  tier,
  classId,
  expanded,
  onToggle,
}: {
  tier: StudentTierGroup
  classId: string
  expanded: boolean
  onToggle: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [aiResult, setAiResult] = useState<RemedialSuggestion | null>(null)

  const tierStyles = {
    excellent: {
      border: 'border-emerald-200 dark:border-emerald-900/50',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
    },
    good: {
      border: 'border-amber-200 dark:border-amber-900/50',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      icon: TrendingUp,
      iconClass: 'text-amber-600',
    },
    needsSupport: {
      border: 'border-rose-200 dark:border-rose-900/50',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      icon: AlertTriangle,
      iconClass: 'text-rose-600',
    },
  }[tier.id]

  const TierIcon = tierStyles.icon

  function handleZenoActivate() {
    startTransition(async () => {
      const topTopic = tier.students[0]?.strongTopics[0] ?? 'Phân thức đại số'
      const res = await generateRemedialSuggestionAction(topTopic, tier.students.length, tier.percent)
      if (res.ok) setAiResult(res.data)
    })
  }

  const actionHref =
    tier.id === 'excellent'
      ? withClassParam('/teacher/test-bank', classId)
      : tier.id === 'good'
        ? withClassParam('/teacher/adaptive', classId)
        : undefined

  const actionLabel =
    tier.id === 'excellent'
      ? 'Giao cụm đề HARD'
      : tier.id === 'good'
        ? 'Giao bài luyện MEDIUM'
        : 'Kích hoạt Zeno AI ôn tập'

  return (
    <Card className={cn('overflow-hidden', tierStyles.border, tierStyles.bg)}>
      <CardHeader>
        <div className="flex items-start gap-2">
          <TierIcon className={cn('mt-0.5 size-4 shrink-0', tierStyles.iconClass)} />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{tier.label}</CardTitle>
            <CardDescription>
              {tier.students.length} HS · {tier.percent}%
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{tier.description}</p>

        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-xs font-medium hover:bg-background"
        >
          Danh sách học sinh
          <ChevronRight
            className={cn('size-3.5 transition-transform', expanded && 'rotate-90')}
          />
        </button>

        {expanded && (
          <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
            {tier.students.length === 0 ? (
              <li className="text-muted-foreground">Chưa có HS trong nhóm</li>
            ) : (
              tier.students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-background/80 px-2 py-1.5"
                >
                  <div>
                    <p className="font-medium">{s.fullName}</p>
                    {s.strongTopics.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                        Mạnh: {s.strongTopics.join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {s.avgScore}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}

        {tier.id === 'needsSupport' ? (
          <Button
            size="sm"
            className="w-full gap-1.5"
            variant="destructive"
            onClick={handleZenoActivate}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Zap className="size-3.5" />
            )}
            {actionLabel}
          </Button>
        ) : (
          <Link
            href={actionHref!}
            className={buttonVariants({ size: 'sm', className: 'w-full gap-1.5' })}
          >
            {actionLabel}
            <ChevronRight className="size-3.5" />
          </Link>
        )}

        {aiResult && tier.id === 'needsSupport' && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-3 text-xs dark:border-teal-900 dark:bg-teal-950/30">
            <p className="font-semibold text-teal-700 dark:text-teal-300">Gợi ý Zeno AI</p>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
              {aiResult.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StudentListModal({ gap, onClose }: { gap: CriticalGap; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-modal-title"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 id="gap-modal-title" className="font-semibold">
              HS bị hổng — {gap.topic}
            </h3>
            <p className="text-xs text-muted-foreground">{gap.affectedStudents.length} học sinh</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Đóng">
            <X className="size-4" />
          </Button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-4">
          {gap.affectedStudents.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0"
            >
              <Avatar size="sm">
                <AvatarFallback className="text-[10px]">{s.initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{s.fullName}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
      <BookOpen className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
