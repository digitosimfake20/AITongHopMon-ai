import { Suspense } from 'react'
import { QuizEditor } from '@/components/quiz/QuizEditor'
import { QuizPackageList } from '@/components/quiz/quiz-package-list'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'

function AssignmentsListSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải đề đã tạo">
      <h2 className="mb-3 text-lg font-semibold text-foreground">Đề đã tạo</h2>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-secondary/60" />
        ))}
      </div>
    </section>
  )
}

async function AssignmentsPackageList({ classId }: { classId: string }) {
  const packages = await getQuizPackagesForClass(classId, 'full')
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Đề đã tạo ({packages.length})
      </h2>
      <QuizPackageList packages={packages} />
    </section>
  )
}

export default async function TeacherAssignmentsPage() {
  const { classroom } = await resolveTeacherContext()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Giao bài & ngân hàng đề</h1>
        <p className="mt-1 text-muted-foreground">
          Tải .docx/.pdf để trích xuất câu hỏi, hoặc soạn thủ công.
        </p>
      </div>

      <Suspense fallback={<AssignmentsListSkeleton />}>
        <AssignmentsPackageList classId={classroom.id} />
      </Suspense>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tạo đề mới</h2>
        <QuizEditor classId={classroom.id} />
      </section>
    </div>
  )
}
