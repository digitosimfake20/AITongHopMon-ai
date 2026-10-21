'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  BookOpen, Clock, Layers, Loader2, Send, X, Filter, Sparkles, BarChart3,
} from 'lucide-react'
import { assignClassTestAction } from '@/app/actions/system-test'
import type { SystemTestSummary } from '@/app/actions/system-test'
import {
  assignAdaptiveGroupAction,
  type TestGroupSummary,
  type AdaptiveAssignmentSummary,
} from '@/app/actions/test-group'
import { SYSTEM_SUBJECTS } from '@/lib/validations/system-test'
import { Button } from '@/components/ui/button'
import { withClassParam } from '@/lib/class/with-class-param'

interface TeacherClassOption {
  id: string
  name: string
  code: string
}

interface TeacherTestBankClientProps {
  tests: SystemTestSummary[]
  groups: TestGroupSummary[]
  adaptiveAssignments: AdaptiveAssignmentSummary[]
  classes: TeacherClassOption[]
  defaultClassId?: string
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TeacherTestBankClient({
  tests,
  groups,
  adaptiveAssignments,
  classes,
  defaultClassId,
}: TeacherTestBankClientProps) {
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [assigning, setAssigning] = useState<SystemTestSummary | null>(null)
  const [assigningGroup, setAssigningGroup] = useState<TestGroupSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? '')
  const [startTime, setStartTime] = useState(() => toLocalInputValue(new Date()))
  const [endTime, setEndTime] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return toLocalInputValue(d)
  })
  const [maxAttempts, setMaxAttempts] = useState<number>(1)
  const [allowReview, setAllowReview] = useState(true)
  const [passScoreThreshold, setPassScoreThreshold] = useState(8.0)

  const filtered = tests.filter((t) => {
    if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false
    if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false
    return true
  })

  const filteredGroups = groups.filter((g) => {
    if (subjectFilter !== 'all' && g.subject !== subjectFilter) return false
    if (gradeFilter !== 'all' && g.grade !== gradeFilter) return false
    return true
  })

  const grouped = useMemo(() => {
    const map = new Map<string, SystemTestSummary[]>()
    for (const t of filtered) {
      const list = map.get(t.subject) ?? []
      list.push(t)
      map.set(t.subject, list)
    }
    return map
  }, [filtered])

  function resetScheduleFields() {
    setClassId(defaultClassId ?? classes[0]?.id ?? '')
    setStartTime(toLocalInputValue(new Date()))
    const end = new Date()
    end.setDate(end.getDate() + 7)
    setEndTime(toLocalInputValue(end))
    setPassScoreThreshold(8.0)
    setMaxAttempts(1)
    setAllowReview(true)
  }

  function openAssign(test: SystemTestSummary) {
    setAssigning(test)
    resetScheduleFields()
  }

  function openAssignGroup(group: TestGroupSummary) {
    setAssigningGroup(group)
    resetScheduleFields()
  }

  function handleConfirmAssign() {
    if (!assigning) return
    if (!classId) {
      toast.error('Vui lòng chọn lớp học')
      return
    }

    startTransition(async () => {
      const result = await assignClassTestAction({
        systemTestId: assigning.id,
        classId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        maxAttempts,
        allowReview,
      })
      if (result.success) {
        toast.success(`Đã giao "${assigning.title}" cho lớp`)
        setAssigning(null)
      } else {
        toast.error(result.error ?? 'Không thể giao đề')
      }
    })
  }

  function handleConfirmAssignGroup() {
    if (!assigningGroup) return
    if (!classId) {
      toast.error('Vui lòng chọn lớp học')
      return
    }

    const toastId = toast.loading(
      `Đang tạo đề 3 cấp độ (${assigningGroup.easyQuestionCount + assigningGroup.mediumQuestionCount + assigningGroup.hardQuestionCount} câu)…`,
    )
    startTransition(async () => {
      const result = await assignAdaptiveGroupAction({
        testGroupId: assigningGroup.id,
        classId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        passScoreThreshold,
        lowScoreThreshold: 5.0,
        allowReview,
      })
      toast.dismiss(toastId)
      if (result.success && result.data) {
        toast.success(`Đã giao cụm đề "${assigningGroup.title}" — 2 lượt bắt buộc`)
        setAssigningGroup(null)
        window.location.href = withClassParam(
          `/teacher/adaptive/${result.data.classTestId}`,
          classId,
        )
      } else {
        toast.error(result.error ?? 'Không thể giao cụm đề')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Ngân hàng đề hệ thống</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Giao đề đơn hoặc cụm đề phân hóa 3 cấp (2 lượt: TB → Dễ/Khó theo điểm).
        </p>
      </div>

      {/* Active adaptive assignments */}
      {adaptiveAssignments.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-slate-700/40 bg-slate-900/30 p-5 dark:bg-slate-950/40">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold">
            <BarChart3 className="size-4 text-cyan-500" />
            // adaptive.assignments
          </h2>
          <ul className="space-y-2">
            {adaptiveAssignments.map((a) => (
              <li key={a.classTestId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.studentCompletedCount}/{a.studentTotalCount} HS hoàn thành 2 lượt
                    · Ngưỡng {a.passScoreThreshold}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 text-xs"
                  nativeButton={false}
                  render={
                    <Link href={withClassParam(`/teacher/adaptive/${a.classTestId}`, a.classId)} />
                  }
                >
                  Xem tổng hợp
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <button
          type="button"
          onClick={() => setSubjectFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            subjectFilter === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'
          }`}
        >
          Tất cả môn
        </button>
        {SYSTEM_SUBJECTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubjectFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              subjectFilter === s ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'
            }`}
          >
            {s}
          </button>
        ))}
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="all">Tất cả khối</option>
          {Array.from(new Set([...tests, ...groups].map((x) => 'grade' in x ? x.grade : ''))).filter(Boolean).sort().map((g) => (
            <option key={g} value={g}>Khối {g}</option>
          ))}
        </select>
      </div>

      {/* Adaptive groups */}
      {filteredGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-4" />
            adaptive.groups
            <span className="rounded-full bg-emerald-950/50 px-2 py-0.5 font-mono text-[11px] normal-case text-emerald-400">
              [{filteredGroups.length}]
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map((g) => (
              <article key={g.id} className="flex flex-col gap-3 rounded-2xl border border-slate-700/40 bg-slate-900/30 p-5">
                <h3 className="font-semibold">{g.title}</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {g.subject} · grade {g.grade}
                  {g.topic && ` · ${g.topic}`}
                </p>
                <p className="font-mono text-xs text-cyan-500/90">
                  EASY {g.easyQuestionCount} · MEDIUM {g.mediumQuestionCount} · HARD {g.hardQuestionCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  2 rounds: L1 MEDIUM → L2 EASY (&lt;8) or HARD (≥8)
                </p>
                <Button
                  type="button"
                  className="mt-auto min-h-10 gap-2 bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => openAssignGroup(g)}
                  disabled={classes.length === 0}
                >
                  <Send className="size-4" />
                  Giao bài tập
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Single tests */}
      {filtered.length === 0 && filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Chưa có đề hệ thống. Admin hãy đăng tại <code className="rounded bg-muted px-1">/admin/test-bank</code>.
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([subject, list]) => (
            <section key={subject} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="size-4" />
                {subject} — Đề đơn
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] normal-case">{list.length} đề</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => (
                  <article key={t.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
                    <h3 className="font-semibold">{t.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <BookOpen className="size-3" /> Khối {t.grade}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <Clock className="size-3" /> {t.durationMinutes} phút
                      </span>
                      <span className="rounded-full border px-2 py-0.5">{t.questionCount} câu</span>
                    </div>
                    <Button type="button" className="mt-auto min-h-10 gap-2" onClick={() => openAssign(t)} disabled={classes.length === 0}>
                      <Send className="size-4" />
                      Giao cho lớp học
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* Single assign modal */}
      {assigning && (
        <AssignModal
          title={`Giao đề: ${assigning.title}`}
          classId={classId}
          setClassId={setClassId}
          classes={classes}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          allowReview={allowReview}
          setAllowReview={setAllowReview}
          isPending={isPending}
          onClose={() => setAssigning(null)}
          onConfirm={handleConfirmAssign}
          extra={
            <div>
              <label className="mb-1.5 block text-sm font-medium">Số lần được làm</label>
              <div className="flex flex-wrap gap-2">
                {[{ label: '1 lần', value: 1 }, { label: '3 lần', value: 3 }, { label: 'Không giới hạn', value: -1 }].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxAttempts(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm ${maxAttempts === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      )}

      {/* Group assign modal */}
      {assigningGroup && (
        <AssignModal
          title={`Giao cụm đề: ${assigningGroup.title}`}
          subtitle="Học sinh bắt buộc làm 2 lượt (TB → Dễ/Khó)"
          classId={classId}
          setClassId={setClassId}
          classes={classes}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          allowReview={allowReview}
          setAllowReview={setAllowReview}
          isPending={isPending}
          onClose={() => setAssigningGroup(null)}
          onConfirm={handleConfirmAssignGroup}
          extra={
            <div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ngưỡng lên đề Khó (≥)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={passScoreThreshold}
                  onChange={(e) => setPassScoreThreshold(Number(e.target.value))}
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Lượt 2: điểm &lt; {passScoreThreshold} → đề Dễ, ≥ {passScoreThreshold} → đề Khó.
              </p>
            </div>
          }
        />
      )}
    </div>
  )
}

function AssignModal({
  title,
  subtitle,
  classId,
  setClassId,
  classes,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  allowReview,
  setAllowReview,
  isPending,
  onClose,
  onConfirm,
  extra,
}: {
  title: string
  subtitle?: string
  classId: string
  setClassId: (v: string) => void
  classes: TeacherClassOption[]
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  allowReview: boolean
  setAllowReview: (v: boolean) => void
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Lớp học</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="min-h-11 w-full rounded-lg border px-3 text-sm">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Mở đề lúc</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="min-h-11 w-full rounded-lg border px-3 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Deadline</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="min-h-11 w-full rounded-lg border px-3 text-sm" />
            </div>
          </div>
          {extra}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowReview} onChange={(e) => setAllowReview(e.target.checked)} className="size-4 rounded" />
            Cho xem lời giải sau khi nộp
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onClose}>Hủy</Button>
          <Button type="button" className="min-h-11 flex-1 gap-2" disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Xác nhận giao
          </Button>
        </div>
      </div>
    </div>
  )
}
