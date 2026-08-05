import { resolveStudentContext } from '@/lib/dashboard/context'
import prisma from '@/lib/prisma'
import { Map, TrendingUp, Circle, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function RoadmapPage() {
  const { user } = await resolveStudentContext()

  const [knowledgeStates, globalMemory] = await prisma.$transaction([
    prisma.studentKnowledgeState.findMany({
      where: { studentId: user.id },
      include: { node: { select: { title: true, subject: true, difficultyLevel: true } } },
      orderBy: { pMastery: 'desc' },
    }),
    prisma.globalAgentMemory.findUnique({
      where: { studentId: user.id },
      select: { longTermSummary: true, updatedAt: true },
    }),
  ])

  const mastered = knowledgeStates.filter((s) => Number(s.pMastery) >= 0.8)
  const progressing = knowledgeStates.filter(
    (s) => Number(s.pMastery) >= 0.5 && Number(s.pMastery) < 0.8,
  )
  const weak = knowledgeStates.filter((s) => Number(s.pMastery) < 0.5)

  const overallMastery =
    knowledgeStates.length > 0
      ? Math.round(
          (knowledgeStates.reduce((sum, s) => sum + Number(s.pMastery), 0) /
            knowledgeStates.length) *
            100,
        )
      : 0

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
            <Map className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Bản đồ Tri thức
            </h1>
            <p className="text-sm text-slate-500">
              {knowledgeStates.length} chủ đề · Thành thạo tổng thể:{' '}
              <span className="font-semibold text-indigo-600">{overallMastery}%</span>
            </p>
          </div>
        </div>

        {knowledgeStates.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> Thành thạo ({mastered.length})
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3.5 text-amber-500" /> Đang tiến ({progressing.length})
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="size-3.5 text-rose-500" /> Cần ôn ({weak.length})
            </span>
          </div>
        )}
      </div>

      {/* Overall progress bar */}
      {knowledgeStates.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-700 dark:text-indigo-300">
              Tiến độ học tập tổng thể
            </span>
            <span className="font-bold text-indigo-600">{overallMastery}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-indigo-200 dark:bg-indigo-900">
            <div
              className="h-3 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${overallMastery}%` }}
            />
          </div>
        </div>
      )}

      {knowledgeStates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Map className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 font-medium text-slate-500">Bản đồ tri thức chưa có dữ liệu</p>
          <p className="mt-1 text-sm text-slate-400">
            Hoàn thành ít nhất một bài kiểm tra để Zeno bắt đầu lập bản đồ kiến thức của bạn.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weak topics */}
          {weak.length > 0 && (
            <TopicSection
              title="Cần ôn lại"
              icon={<AlertCircle className="size-4 text-rose-500" />}
              states={weak}
              barColor="bg-rose-400"
              badgeClass="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            />
          )}

          {/* Progressing */}
          {progressing.length > 0 && (
            <TopicSection
              title="Đang tiến bộ"
              icon={<TrendingUp className="size-4 text-amber-500" />}
              states={progressing}
              barColor="bg-amber-400"
              badgeClass="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            />
          )}

          {/* Mastered */}
          {mastered.length > 0 && (
            <TopicSection
              title="Đã thành thạo"
              icon={<CheckCircle2 className="size-4 text-emerald-500" />}
              states={mastered}
              barColor="bg-emerald-500"
              badgeClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            />
          )}
        </div>
      )}

      {/* Zeno long-term memory snippet */}
      {globalMemory?.longTermSummary && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="mb-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
            Nhật ký học tập của Zeno
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {globalMemory.longTermSummary.split('\n').at(-1)?.trim()}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            Cập nhật: {new Date(globalMemory.updatedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      )}
    </main>
  )
}

// ---------------------------------------------------------------------------
// Helper component
// ---------------------------------------------------------------------------

function TopicSection({
  title,
  icon,
  states,
  barColor,
  badgeClass,
}: {
  title: string
  icon: React.ReactNode
  states: Array<{
    nodeId: string
    pMastery: unknown
    node: { title: string }
    lastPracticedAt: Date | null
  }>
  barColor: string
  badgeClass: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
        >
          {states.length}
        </span>
      </div>
      <div className="space-y-3">
        {states.map((state) => {
          const mastery = Math.round(Number(state.pMastery) * 100)
          return (
            <div key={state.nodeId}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {state.node.title}
                </p>
                <span className="text-[10px] font-semibold text-slate-400">{mastery}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-1.5 rounded-full ${barColor} transition-all`}
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
