import { ClassKnowledgeGapMap } from '@/components/teacher/class-knowledge-gap-map'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getClassGapMapData } from '@/lib/quiz/class-gap-map'
import { BookOpen } from 'lucide-react'

export default async function TeacherGapsPage() {
  const { user, classroom } = await resolveTeacherContext()
  const data = await getClassGapMapData(classroom.id, user.id)

  if (!data) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">
          Không tải được bản đồ lỗ hổng
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tải lại trang. Nếu vẫn lỗi, kiểm tra quyền lớp hoặc liên hệ quản trị.
        </p>
      </main>
    )
  }

  const hasData =
    data.topicMastery.length > 0 ||
    data.criticalGaps.length > 0 ||
    data.tierGroups.some((t) => t.students.length > 0)

  if (!hasData) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
          <BookOpen className="size-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Chưa có dữ liệu lỗ hổng
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Chưa có bài nộp. Giao bài kiểm tra và chờ học sinh hoàn thành.
        </p>
      </main>
    )
  }

  return (
    <main>
      <ClassKnowledgeGapMap data={data} classId={classroom.id} />
    </main>
  )
}
