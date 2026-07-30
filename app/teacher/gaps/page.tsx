import { resolveTeacherContext } from '@/lib/dashboard/context'
import prisma from '@/lib/prisma'
import { AlertTriangle, Users, BookOpen, TrendingDown } from 'lucide-react'

export default async function TeacherGapsPage() {
  const { classroom, shell } = await resolveTeacherContext()
  const { classId, studentCount } = shell

  // ── Fetch all wrong answers for this class ─────────────────────────────────
  const wrongDetails = await prisma.submissionDetail.findMany({
    where: {
      isCorrect: false,
      submission: { test: { classId } },
    },
    select: {
      questionId: true,
      timeSpentSeconds: true,
      submission: {
        select: { studentId: true, submittedAt: true },
      },
    },
    take: 5000,
  })

  if (wrongDetails.length === 0) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
          <BookOpen className="size-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Chưa có dữ liệu lỗ hổng
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          Chưa có bài nộp nào được ghi nhận sai. Hãy chờ học sinh hoàn thành bài kiểm tra.
        </p>
      </main>
    )
  }

  // ── Aggregate by topic ─────────────────────────────────────────────────────
  const uniqueQIds = [...new Set(wrongDetails.map((d) => d.questionId))]
  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueQIds } },
    select: { id: true, topic: true, type: true },
  })
  const qMeta = new Map(questions.map((q) => [q.id, q]))

  type TopicStats = {
    wrongCount: number
    totalTime: number
    studentIds: Set<string>
    types: Set<string>
    recentDate: Date | null
  }
  const byTopic = new Map<string, TopicStats>()

  for (const d of wrongDetails) {
    const meta = qMeta.get(d.questionId)
    const topic = meta?.topic ?? 'Chủ đề khác'
    if (!byTopic.has(topic)) {
      byTopic.set(topic, {
        wrongCount: 0,
        totalTime: 0,
        studentIds: new Set(),
        types: new Set(),
        recentDate: null,
      })
    }
    const entry = byTopic.get(topic)!
    entry.wrongCount++
    entry.totalTime += d.timeSpentSeconds
    entry.studentIds.add(d.submission.studentId)
    if (meta?.type) entry.types.add(meta.type)
    const date = d.submission.submittedAt
    if (!entry.recentDate || date > entry.recentDate) entry.recentDate = date
  }

  const gaps = [...byTopic.entries()]
    .sort((a, b) => b[1].wrongCount - a[1].wrongCount)
    .map(([topic, stats]) => {
      const studentPercent =
        studentCount > 0 ? Math.round((stats.studentIds.size / studentCount) * 100) : 0
      const avgTime = stats.wrongCount > 0 ? Math.round(stats.totalTime / stats.wrongCount) : 0
      return {
        topic,
        wrongCount: stats.wrongCount,
        studentsAffected: stats.studentIds.size,
        studentPercent,
        avgTimeSeconds: avgTime,
        types: [...stats.types],
        recentDate: stats.recentDate,
      }
    })

  const totalWrongAnswers = wrongDetails.length
  const topicsAffected = gaps.length

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
          <AlertTriangle className="size-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Bản đồ Lỗ hổng Kiến thức — {classroom.name}
          </h1>
          <p className="text-sm text-slate-500">
            {topicsAffected} chủ đề · {totalWrongAnswers} lượt sai toàn lớp
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Lượt sai tổng"
          value={String(totalWrongAnswers)}
          icon={<TrendingDown className="size-4 text-rose-500" />}
          color="rose"
        />
        <StatCard
          label="Chủ đề yếu"
          value={String(topicsAffected)}
          icon={<AlertTriangle className="size-4 text-amber-500" />}
          color="amber"
        />
        <StatCard
          label="Học sinh chịu ảnh hưởng"
          value={`${new Set(wrongDetails.map((d) => d.submission.studentId)).size}/${studentCount}`}
          icon={<Users className="size-4 text-blue-500" />}
          color="blue"
        />
        <StatCard
          label="Tỷ lệ sai TB"
          value={`${studentCount > 0 ? Math.round((new Set(wrongDetails.map((d) => d.submission.studentId)).size / studentCount) * 100) : 0}%`}
          icon={<BookOpen className="size-4 text-violet-500" />}
          color="violet"
        />
      </div>

      {/* Gap cards */}
      <div className="space-y-3">
        {gaps.map((gap, idx) => (
          <div
            key={gap.topic}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                {idx + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{gap.topic}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  <span>{gap.wrongCount} lượt sai</span>
                  <span>
                    {gap.studentsAffected}/{studentCount} học sinh ({gap.studentPercent}%)
                  </span>
                  <span>
                    Thời gian TB:{' '}
                    {gap.avgTimeSeconds < 15 ? (
                      <span className="text-amber-600 font-medium">
                        {gap.avgTimeSeconds}s (có thể đoán mò)
                      </span>
                    ) : gap.avgTimeSeconds > 120 ? (
                      <span className="text-rose-600 font-medium">
                        {gap.avgTimeSeconds}s (lỗ hổng sâu)
                      </span>
                    ) : (
                      <span>{gap.avgTimeSeconds}s</span>
                    )}
                  </span>
                  {gap.recentDate && (
                    <span>Gần nhất: {new Date(gap.recentDate).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-1.5 rounded-full bg-rose-400 transition-all"
                      style={{ width: `${Math.min(100, gap.studentPercent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{gap.studentPercent}% lớp</span>
                </div>

                {/* Question types */}
                {gap.types.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {gap.types.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {t === 'MULTIPLE_CHOICE'
                          ? 'Trắc nghiệm'
                          : t === 'TRUE_FALSE_GROUP'
                            ? 'Đúng/Sai'
                            : t === 'SHORT_ANSWER'
                              ? 'Điền ngắn'
                              : 'Tự luận'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type StatColor = 'rose' | 'amber' | 'blue' | 'violet'
const COLOR_MAP: Record<StatColor, string> = {
  rose: 'bg-rose-50 dark:bg-rose-950/40',
  amber: 'bg-amber-50 dark:bg-amber-950/40',
  blue: 'bg-blue-50 dark:bg-blue-950/40',
  violet: 'bg-violet-50 dark:bg-violet-950/40',
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: StatColor
}) {
  return (
    <div className={`rounded-2xl ${COLOR_MAP[color]} p-4`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}
