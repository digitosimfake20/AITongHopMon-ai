'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  FileJson, Loader2, Upload, Trash2, Layers, Sparkles, Clock, Pencil, X, Terminal,
} from 'lucide-react'
import {
  publishSystemTestAction,
  deleteSystemTestAction,
} from '@/app/actions/system-test'
import type { SystemTestSummary } from '@/app/actions/system-test'
import {
  publishTestGroupAction,
  deleteTestGroupAction,
  getTestGroupForEditAction,
  updateTestGroupAction,
  listTestGroupsAction,
} from '@/app/actions/test-group'
import type { TestGroupSummary } from '@/app/actions/test-group'
import { JsonImportEditor } from '@/components/admin/json-import-editor'
import {
  testDraftToPayload,
  validateTestDraft,
  type TestDraft,
} from '@/lib/system-test/test-draft'
import { SYSTEM_SUBJECTS } from '@/lib/validations/system-test'
import { Button } from '@/components/ui/button'

const SAMPLE_JSON = `{
  "title": "Kiểm tra 15 phút - Phân thức đại số",
  "subject": "Toán",
  "grade": "8",
  "durationMinutes": 15,
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "content": "Phân thức $\\\\frac{x}{x-1}$ xác định khi:",
      "topic": "Điều kiện xác định",
      "options": ["$x = 1$", "$x \\\\neq 1$", "$x > 1$", "$x < 1$"],
      "correctAnswer": 1,
      "explanation": "Mẫu số khác 0 nên $x \\\\neq 1$.",
      "points": 1
    }
  ]
}`

type Tab = 'single' | 'group'
type GroupTier = 'easy' | 'medium' | 'hard'

const TIER_LABELS: Record<GroupTier, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

const TIER_HINT: Record<GroupTier, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
}

const TIER_BORDER: Record<GroupTier, string> = {
  easy: 'border-emerald-500/40',
  medium: 'border-cyan-500/40',
  hard: 'border-orange-500/40',
}

const TIER_ACTIVE: Record<GroupTier, string> = {
  easy: 'bg-emerald-600 text-white',
  medium: 'bg-cyan-600 text-white',
  hard: 'bg-orange-600 text-white',
}

const TIER_TITLE_SUFFIX: Record<GroupTier, string> = {
  easy: 'Dễ',
  medium: 'TB',
  hard: 'Khó',
}

interface AdminTestBankClientProps {
  initialTests: SystemTestSummary[]
  initialGroups: TestGroupSummary[]
}

function resetGroupForm() {
  return {
    groupTitle: '',
    groupSubject: 'Toán',
    groupGrade: '8',
    groupTopic: '',
    groupDescription: '',
    groupDurationMinutes: 15,
    easyDraft: null as TestDraft | null,
    mediumDraft: null as TestDraft | null,
    hardDraft: null as TestDraft | null,
  }
}

export function AdminTestBankClient({
  initialTests,
  initialGroups,
}: AdminTestBankClientProps) {
  const [tab, setTab] = useState<Tab>('single')
  const [tests, setTests] = useState(initialTests)
  const [groups, setGroups] = useState(initialGroups)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)

  const [singleDraft, setSingleDraft] = useState<TestDraft | null>(null)

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingAssignedCount, setEditingAssignedCount] = useState(0)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupSubject, setGroupSubject] = useState('Toán')
  const [groupGrade, setGroupGrade] = useState('8')
  const [groupTopic, setGroupTopic] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupDurationMinutes, setGroupDurationMinutes] = useState(15)
  const [activeTier, setActiveTier] = useState<GroupTier>('medium')
  const [easyDraft, setEasyDraft] = useState<TestDraft | null>(null)
  const [mediumDraft, setMediumDraft] = useState<TestDraft | null>(null)
  const [hardDraft, setHardDraft] = useState<TestDraft | null>(null)

  const tierDrafts: Record<GroupTier, TestDraft | null> = {
    easy: easyDraft,
    medium: mediumDraft,
    hard: hardDraft,
  }
  const tierSetters: Record<GroupTier, (d: TestDraft | null) => void> = {
    easy: setEasyDraft,
    medium: setMediumDraft,
    hard: setHardDraft,
  }

  function cancelGroupEdit() {
    const reset = resetGroupForm()
    setEditingGroupId(null)
    setEditingAssignedCount(0)
    setGroupTitle(reset.groupTitle)
    setGroupSubject(reset.groupSubject)
    setGroupGrade(reset.groupGrade)
    setGroupTopic(reset.groupTopic)
    setGroupDescription(reset.groupDescription)
    setGroupDurationMinutes(reset.groupDurationMinutes)
    setEasyDraft(reset.easyDraft)
    setMediumDraft(reset.mediumDraft)
    setHardDraft(reset.hardDraft)
    setActiveTier('medium')
  }

  function handleStartEditGroup(groupId: string) {
    setLoadingEditId(groupId)
    startTransition(async () => {
      const result = await getTestGroupForEditAction(groupId)
      setLoadingEditId(null)
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Không thể tải cụm đề')
        return
      }
      const d = result.data
      setTab('group')
      setEditingGroupId(d.id)
      setEditingAssignedCount(d.assignedClassCount)
      setGroupTitle(d.title)
      setGroupSubject(d.subject)
      setGroupGrade(d.grade)
      setGroupTopic(d.topic)
      setGroupDescription(d.description ?? '')
      setGroupDurationMinutes(d.durationMinutes)
      setEasyDraft(d.easyDraft)
      setMediumDraft(d.mediumDraft)
      setHardDraft(d.hardDraft)
      setActiveTier('medium')
      if (d.assignedClassCount > 0) {
        toast.info(
          `Cụm đề đã giao ${d.assignedClassCount} lớp — thay đổi áp dụng cho lần giao mới; lớp đang làm giữ bản cũ.`,
        )
      } else {
        toast.success('Đã tải cụm đề — chỉnh sửa và bấm Lưu cập nhật')
      }
    })
  }

  function applyGroupFields(draft: TestDraft, tier: GroupTier): TestDraft {
    return {
      ...draft,
      title: `${groupTitle.trim()} — ${TIER_TITLE_SUFFIX[tier]}`,
      subject: groupSubject,
      grade: groupGrade,
      durationMinutes: groupDurationMinutes,
    }
  }

  function handlePublishSingle() {
    if (!singleDraft) {
      toast.error('Hãy dán JSON và bấm "Phân tích JSON" trước')
      return
    }

    const validation = validateTestDraft(singleDraft)
    if (!validation.ok) {
      toast.error(validation.error)
      return
    }

    startTransition(async () => {
      const result = await publishSystemTestAction(testDraftToPayload(singleDraft))
      if (result.success) {
        toast.success('Đã đăng đề lên ngân hàng hệ thống')
        window.location.reload()
      } else {
        toast.error(result.error ?? 'Không thể đăng đề')
      }
    })
  }

  function buildGroupPayload() {
    return {
      title: groupTitle,
      subject: groupSubject,
      grade: groupGrade,
      topic: groupTopic,
      description: groupDescription || undefined,
      easyJson: testDraftToPayload(applyGroupFields(easyDraft!, 'easy')),
      mediumJson: testDraftToPayload(applyGroupFields(mediumDraft!, 'medium')),
      hardJson: testDraftToPayload(applyGroupFields(hardDraft!, 'hard')),
    }
  }

  function validateGroupTiers(): boolean {
    if (!groupTitle.trim()) {
      toast.error('Nhập tiêu đề cụm đề')
      return false
    }
    if (groupDurationMinutes < 1) {
      toast.error('Thời gian làm bài phải ≥ 1 phút')
      return false
    }

    const tiers: GroupTier[] = ['easy', 'medium', 'hard']
    for (const tier of tiers) {
      const draft = tierDrafts[tier]
      if (!draft) {
        toast.error(`Chưa import/chỉnh sửa JSON cấp ${TIER_HINT[tier]} (${TIER_LABELS[tier]})`)
        return false
      }
      const withFields = applyGroupFields(draft, tier)
      const validation = validateTestDraft(withFields)
      if (!validation.ok) {
        toast.error(`${TIER_LABELS[tier]}: ${validation.error}`)
        return false
      }
    }
    return true
  }

  function handlePublishGroup() {
    if (!validateGroupTiers()) return

    startTransition(async () => {
      const result = await publishTestGroupAction(buildGroupPayload())
      if (result.success) {
        toast.success('Đã tạo cụm đề phân hóa 3 cấp độ')
        window.location.reload()
      } else {
        toast.error(result.error ?? 'Không thể tạo cụm đề')
      }
    })
  }

  function handleUpdateGroup() {
    if (!editingGroupId) return
    if (!validateGroupTiers()) return

    const toastId = toast.loading('Đang lưu cụm đề…')
    startTransition(async () => {
      const result = await updateTestGroupAction({
        groupId: editingGroupId,
        ...buildGroupPayload(),
      })
      toast.dismiss(toastId)
      if (result.success) {
        cancelGroupEdit()
        toast.success('Đã cập nhật cụm đề phân hóa')
        void listTestGroupsAction().then((listResult) => {
          if (listResult.success && listResult.data) {
            setGroups(listResult.data)
          }
        })
      } else {
        toast.error(result.error ?? 'Không thể cập nhật cụm đề')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Xóa đề hệ thống này?')) return
    startTransition(async () => {
      const result = await deleteSystemTestAction(id)
      if (result.success) {
        setTests((prev) => prev.filter((t) => t.id !== id))
        toast.success('Đã xóa đề')
      } else {
        toast.error(result.error ?? 'Không thể xóa')
      }
    })
  }

  function handleDeleteGroup(id: string) {
    if (!confirm('Xóa cụm đề này?')) return
    startTransition(async () => {
      const result = await deleteTestGroupAction(id)
      if (result.success) {
        setGroups((prev) => prev.filter((g) => g.id !== id))
        if (editingGroupId === id) cancelGroupEdit()
        toast.success('Đã xóa cụm đề')
      } else {
        toast.error(result.error ?? 'Không thể xóa')
      }
    })
  }

  const filtered =
    subjectFilter === 'all' ? tests : tests.filter((t) => t.subject === subjectFilter)
  const filteredGroups =
    subjectFilter === 'all' ? groups : groups.filter((g) => g.subject === subjectFilter)

  const groupReady = easyDraft && mediumDraft && hardDraft && groupTitle.trim()
  const isEditing = editingGroupId !== null

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight">
          <span className="text-cyan-500">$</span> ngân-hàng-đề
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dán JSON → chỉnh sửa câu hỏi trực tiếp → đăng. Lỗi JSON hiển thị ngay khi parse.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-700/30 pb-1 dark:border-slate-600/40">
        <button
          type="button"
          onClick={() => setTab('single')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 font-mono text-sm font-medium ${
            tab === 'single'
              ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileJson className="size-4" />
          single.test
        </button>
        <button
          type="button"
          onClick={() => setTab('group')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 font-mono text-sm font-medium ${
            tab === 'group'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Terminal className="size-4" />
          adaptive.group
        </button>
      </div>

      {tab === 'single' ? (
        <section className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-950/20 p-6 dark:bg-slate-900/40">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileJson className="size-4 text-cyan-500" />
            <span className="font-mono text-sm">// publish single test</span>
          </h2>
          <JsonImportEditor
            label="Import & chỉnh sửa đề"
            draft={singleDraft}
            onDraftChange={setSingleDraft}
            sampleJson={SAMPLE_JSON}
            accentClass="border-cyan-500/30"
          />
          <Button
            type="button"
            disabled={isPending || !singleDraft}
            onClick={handlePublishSingle}
            className="min-h-11 gap-2 bg-cyan-600 hover:bg-cyan-500"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Đăng đề lên hệ thống
          </Button>
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border border-slate-700/40 bg-slate-950/30 p-6 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Layers className="size-4 text-emerald-500" />
              <span className="font-mono text-sm">
                {isEditing ? '// edit adaptive.group' : '// create adaptive.group'}
              </span>
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={cancelGroupEdit}
                className="flex items-center gap-1 rounded-lg border border-slate-600/50 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:bg-slate-800/50"
              >
                <X className="size-3.5" />
                Hủy sửa
              </button>
            )}
          </div>

          {isEditing && editingAssignedCount > 0 && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 font-mono text-xs text-amber-400">
              // assigned×{editingAssignedCount} — chỉnh sửa ngân hàng; lớp đang làm giữ bản đã giao
            </p>
          )}

          <div className="grid gap-3 rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 font-mono text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-cyan-500/80">title</label>
              <input
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm text-foreground"
                placeholder="Kiểm tra Phân thức đại số"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-cyan-500/80">topic</label>
              <input
                value={groupTopic}
                onChange={(e) => setGroupTopic(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-cyan-500/80">
                <Clock className="size-3.5" />
                durationMinutes (cả 3 tier)
              </label>
              <input
                type="number"
                min={1}
                value={groupDurationMinutes}
                onChange={(e) =>
                  setGroupDurationMinutes(Math.max(1, Number(e.target.value) || 1))
                }
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-cyan-500/80">subject</label>
              <select
                value={groupSubject}
                onChange={(e) => setGroupSubject(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm"
              >
                {SYSTEM_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-cyan-500/80">grade</label>
              <input
                value={groupGrade}
                onChange={(e) => setGroupGrade(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-cyan-500/80">description?</label>
              <input
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['easy', 'medium', 'hard'] as GroupTier[]).map((tier) => {
              const done = !!tierDrafts[tier]
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setActiveTier(tier)}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                    activeTier === tier
                      ? TIER_ACTIVE[tier]
                      : done
                        ? 'border border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                        : 'border border-slate-600/50 bg-slate-900/50 text-muted-foreground'
                  }`}
                >
                  {TIER_LABELS[tier]}
                  <span className="ml-1 opacity-70">({TIER_HINT[tier]})</span>
                  {done ? ' ✓' : ''}
                </button>
              )
            })}
          </div>

          {(['easy', 'medium', 'hard'] as GroupTier[]).map((tier) => (
            <div key={tier} className={activeTier === tier ? 'block' : 'hidden'}>
              <JsonImportEditor
                key={`${editingGroupId ?? 'new'}-${tier}`}
                label={`${TIER_LABELS[tier]} — ${TIER_HINT[tier]}`}
                accentClass={TIER_BORDER[tier]}
                draft={tierDrafts[tier]}
                onDraftChange={tierSetters[tier]}
                hideMetadata
                hideDuration
                sampleJson={SAMPLE_JSON}
              />
            </div>
          ))}

          <p className="font-mono text-xs text-muted-foreground">
            {'// '}Mỗi tier: dán JSON → parse → chỉnh câu. duration={groupDurationMinutes}m áp dụng cả 3.
          </p>

          {isEditing ? (
            <Button
              type="button"
              disabled={isPending || !groupReady}
              onClick={handleUpdateGroup}
              className="min-h-11 gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
              Lưu cập nhật cụm đề
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending || !groupReady}
              onClick={handlePublishGroup}
              className="min-h-11 gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Tạo cụm đề phân hóa
            </Button>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-mono text-sm font-semibold text-muted-foreground">
          {tab === 'single' ? `// tests[${filtered.length}]` : `// groups[${filteredGroups.length}]`}
        </h2>
        {tab === 'single' ? (
          filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600/40 p-10 text-center font-mono text-sm text-muted-foreground">
              empty array
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/30 bg-slate-900/30 px-4 py-3">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.subject} · grade {t.grade} · {t.durationMinutes}m · {t.questionCount} q
                    </p>
                  </div>
                  <button type="button" disabled={isPending} onClick={() => handleDelete(t.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-950/30">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-600/40 p-10 text-center font-mono text-sm text-muted-foreground">
            empty array
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredGroups.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-900/30 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{g.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {g.subject} · grade {g.grade}
                    {g.topic && ` · ${g.topic}`}
                    {g.durationMinutes > 0 && ` · ${g.durationMinutes}m`}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-cyan-500/90">
                    EASY {g.easyQuestionCount} · MEDIUM {g.mediumQuestionCount} · HARD {g.hardQuestionCount}
                    {g.assignedClassCount > 0 && (
                      <span className="ml-2 text-amber-500/90">· assigned×{g.assignedClassCount}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={isPending || loadingEditId === g.id}
                    title="Sửa cụm đề"
                    onClick={() => handleStartEditGroup(g.id)}
                    className="rounded-lg p-2 text-cyan-500 hover:bg-cyan-950/30 disabled:opacity-40"
                  >
                    {loadingEditId === g.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Pencil className="size-4" />
                    )}
                  </button>
                  <button type="button" disabled={isPending} onClick={() => handleDeleteGroup(g.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-950/30">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
