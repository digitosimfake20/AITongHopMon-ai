import Link from 'next/link'
import { ClassKnowledgeGapMap } from '@/components/teacher/class-knowledge-gap-map'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getClassGapMapData } from '@/lib/quiz/class-gap-map'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'
import { BookOpen } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ quiz?: string }>
}

export default async function TeacherGapsPage({ searchParams }: PageProps) {
  const { quiz: quizPackageId } = await searchParams
  const { user, classroom } = await resolveTeacherContext()
  const data = await getClassGapMapData(classroom.id, user.id)

  let quizBanner: { title: string; found: boolean } | null = null
  if (quizPackageId) {
    const packages = await getQuizPackagesForClass(classroom.id)
    const pkg = packages.find((p) => p.id === quizPackageId)
    quizBanner = {
      title: pkg?.title ?? quizPackageId,
      found: Boolean(pkg),
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">
          Không tải được bản đồ lỗ hổng
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tải lại trang. Nếu vẫn lỗi, kiểm tra quyền lớp hoặc liên hệ quản trị.
        </p>
      </div>
    )
  }

  const hasData =
    data.topicMastery.length > 0 ||
    data.criticalGaps.length > 0 ||
    data.tierGroups.some((t) => t.students.length > 0)

  if (!hasData) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
          <BookOpen className="size-7 text-emerald-600" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Chưa có dữ liệu lỗ hổng
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Chưa có bài nộp. Giao bài kiểm tra và chờ học sinh hoàn thành.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {quizBanner ? (
        <div
          className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm"
          role="status"
        >
          {quizBanner.found ? (
            <p className="text-foreground">
              Báo cáo lớp cho bài <strong>{quizBanner.title}</strong>. Bản đồ dưới đây tổng hợp mọi
              bài đã nộp của lớp.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Không tìm thấy bài đã giao khớp liên kết. Đang hiển thị lỗ hổng cả lớp.{' '}
              <Link href="/teacher/gaps" className="font-medium text-primary underline-offset-4 hover:underline">
                Bỏ bộ lọc
              </Link>
            </p>
          )}
        </div>
      ) : null}
      <ClassKnowledgeGapMap data={data} classId={classroom.id} />
    </div>
  )
}
