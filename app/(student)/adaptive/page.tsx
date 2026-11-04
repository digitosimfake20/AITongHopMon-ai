import { resolveStudentContext } from '@/lib/dashboard/context'
import prisma from '@/lib/prisma'
import { AiProfileCard } from '@/components/student/ai-profile-card'
import { AdaptiveTopicList } from '@/components/student/adaptive-topic-list'
import { Brain, Zap, TrendingDown, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ topic?: string }>
}

export default async function AdaptivePage({ searchParams }: PageProps) {
  const { topic: topicParam } = await searchParams
  const focusTopicId = topicParam?.trim() || null
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

  const topics = knowledgeStates.map((state) => ({
    nodeId: state.nodeId,
    title: state.node.title,
    pMastery: Number(state.pMastery),
  }))

  const focusExists = focusTopicId
    ? topics.some((t) => t.nodeId === focusTopicId)
    : false

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zeno/15">
          <Zap className="size-5 text-zeno" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Luyện theo lỗ hổng
          </h1>
          <p className="text-sm text-muted-foreground">
            Câu hỏi từ kho đề theo chủ đề còn yếu, riêng với bài phân hóa 2 lượt của lớp
          </p>
        </div>
      </div>

      <AiProfileCard
        profile={cognitiveProfile}
        focusTopicId={focusExists ? focusTopicId : null}
        focusTopicTitle={
          focusExists
            ? topics.find((t) => t.nodeId === focusTopicId)?.title
            : undefined
        }
      />

      {knowledgeStates.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <TrendingDown className="size-4" aria-hidden />
            Chủ đề đang theo dõi ({knowledgeStates.length})
          </h2>
          {focusTopicId && !focusExists ? (
            <p className="mb-3 text-sm text-muted-foreground" role="status">
              Không tìm thấy chủ đề trong hồ sơ hiện tại. Hiển thị toàn bộ chủ đề đang theo dõi.
            </p>
          ) : null}
          <AdaptiveTopicList
            topics={topics}
            focusTopicId={focusExists ? focusTopicId : null}
          />
        </section>
      )}

      {knowledgeStates.length === 0 && !profile && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Brain className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 font-medium text-muted-foreground">Chưa có dữ liệu học tập</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Làm bài kiểm tra đầu tiên để Zeno lập hồ sơ kiến thức của bạn.
          </p>
          <Link
            href="/quizzes"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-zeno px-4 py-2 text-sm font-medium text-zeno-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2"
          >
            <BookOpen className="size-4" aria-hidden />
            Xem đề kiểm tra
          </Link>
        </div>
      )}

      {personalizedTests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BookOpen className="size-4" aria-hidden />
            Bài luyện gần đây
          </h2>
          <div className="space-y-2">
            {personalizedTests.map((test) => {
              const latest = test.submissions[0]
              return (
                <div
                  key={test.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {test.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(test.questionIds as string[]).length} câu · {test.timeLimitMinutes} phút
                    </p>
                  </div>
                  {latest ? (
                    <Link
                      href={`/quiz/result/${latest.id}`}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {Number(latest.score).toFixed(1)}/10 · Xem kết quả
                    </Link>
                  ) : (
                    <Link
                      href={`/quiz/take/${test.id}`}
                      prefetch={false}
                      className="inline-flex min-h-11 items-center rounded-lg bg-zeno px-3 py-2 text-xs font-semibold text-zeno-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zeno focus-visible:ring-offset-2"
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
    </div>
  )
}
