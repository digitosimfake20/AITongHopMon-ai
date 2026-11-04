import { Suspense } from 'react'
import { Sparkles } from 'lucide-react'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { listAdaptiveAssignmentsForClass } from '@/lib/quiz/adaptive-list-queries'
import { TeacherAdaptiveListClient } from '@/components/teacher/teacher-adaptive-list-client'

function AdaptiveListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải bài giao phân hóa">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Sparkles className="size-5 text-zeno" />
          Bài giao phân hóa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi 2 lượt làm bài (Lượt 1 Trung bình → Lượt 2 Dễ/Khó).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-border bg-secondary/60"
          />
        ))}
      </div>
    </div>
  )
}

async function AdaptiveListData({ classId }: { classId: string }) {
  const assignments = await listAdaptiveAssignmentsForClass(classId)
  return <TeacherAdaptiveListClient assignments={assignments} classId={classId} />
}

export default async function TeacherAdaptiveListPage() {
  const { classroom } = await resolveTeacherContext()

  return (
    <Suspense fallback={<AdaptiveListSkeleton />}>
      <AdaptiveListData classId={classroom.id} />
    </Suspense>
  )
}
