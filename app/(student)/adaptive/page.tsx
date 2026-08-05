import { resolveStudentContext } from '@/lib/dashboard/context'
import prisma from '@/lib/prisma'
import { AiProfileCard } from '@/components/student/ai-profile-card'
import { Brain, Zap, TrendingDown, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function AdaptivePage() {
  const { user, classroom } = await resolveStudentContext()

  const [profile, knowledgeStates, personalizedTests] = await prisma.$transaction([
    prisma.studentCognitiveProfile.findUnique({ where: { studentId: user.id } }),
    prisma.studentKnowledgeState.findMany({
      where: { studentId: user.id },
      include: { node: { select: { title: true, subject: true } } },
      orderBy: { pMastery: 'asc' },
      take: 10,
    }),
    prisma.test.findMany({
      where: {
        classId: classroom.id,
        title: { startsWith: 'Luyện tập cá nhân hóa' },
      },
      include: {
        submissions: {
          where: { studentId: user.id },
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { id: true, score: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const cognitiveProfile = profile
    ? {
        personaType: profile.personaType,
        avgSpeed: Math.round(Number(profile.avgSpeedPerQuestion)),
        carelessRate: Math.round(Number(profile.carelessErrorRate) * 100),
        strengths: profile.strengthsSummary,
        weaknesses: profile.weaknessesSummary,
      }
    : null

  const weakStates = knowledgeStates.filter((s) => Number(s.pMastery) < 0.5)
  const mediumStates = knowledgeStates.filter(
    (s) => Number(s.pMastery) >= 0.5 && Number(s.pMastery) < 0.8,
  )

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950">
          <Zap className="size-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Luyện tập Thích ứng
          </h1>
          <p className="text-sm text-slate-500">
            AI chọn câu hỏi dựa trên điểm yếu cá nhân của bạn
          </p>
        </div>
      </div>

      {/* AI Profile Card — generates personalized quiz */}
      <AiProfileCard profile={cognitiveProfile} />

      {/* Weak topics breakdown */}
      {knowledgeStates.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <TrendingDown className="size-4" />
            Phân tích Chủ đề ({knowledgeStates.length} chủ đề đã theo dõi)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeStates.map((state) => {
              const mastery = Math.round(Number(state.pMastery) * 100)
              const colorClass =
                mastery < 50
                  ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
                  : mastery < 80
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                    : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
              const barColor =
                mastery < 50 ? 'bg-rose-400' : mastery < 80 ? 'bg-amber-400' : 'bg-emerald-500'
              const label =
                mastery < 50 ? 'Cần ôn lại' : mastery < 80 ? 'Đang tiến bộ' : 'Thành thạo'

              return (
                <div
                  key={state.nodeId}
                  className={`rounded-xl border p-3 ${colorClass}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {state.node.title}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {mastery}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-1.5 rounded-full ${barColor} transition-all`}
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">{label}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {knowledgeStates.length === 0 && !profile && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Brain className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 font-medium text-slate-500">Chưa có dữ liệu học tập</p>
          <p className="mt-1 text-sm text-slate-400">
            Hoàn thành bài kiểm tra đầu tiên để Zeno bắt đầu cá nhân hóa lộ trình của bạn.
          </p>
          <Link
            href="/quizzes"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <BookOpen className="size-4" />
            Xem đề kiểm tra
          </Link>
        </div>
      )}

      {/* Recent personalized tests */}
      {personalizedTests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <BookOpen className="size-4" />
            Bài luyện cá nhân hóa gần đây
          </h2>
          <div className="space-y-2">
            {personalizedTests.map((test) => {
              const latest = test.submissions[0]
              return (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {test.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(test.questionIds as string[]).length} câu · {test.timeLimitMinutes} phút
                    </p>
                  </div>
                  {latest ? (
                    <Link
                      href={`/quiz/result/${latest.id}`}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {Number(latest.score).toFixed(1)}/10 — Xem kết quả
                    </Link>
                  ) : (
                    <Link
                      href={`/quiz/take/${test.id}`}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      Làm bài
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
