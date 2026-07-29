import { QuizEditor } from '@/components/quiz/QuizEditor'
import { QuizPackageList } from '@/components/quiz/quiz-package-list'
import { resolveTeacherContext } from '@/lib/dashboard/context'
import { getQuizPackagesForClass } from '@/lib/quiz/queries'

export default async function TeacherAssignmentsPage() {
  const { classroom } = await resolveTeacherContext()
  const packages = await getQuizPackagesForClass(classroom.id)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Giao bài & Ngân hàng Đề</h1>
        <p className="mt-1 text-muted-foreground">
          Tải lên tệp .docx/.pdf để AI tự động trích xuất câu hỏi, hoặc soạn thủ công.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Đề đã tạo ({packages.length})</h2>
        <QuizPackageList packages={packages} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tạo đề mới</h2>
        <QuizEditor classId={classroom.id} />
      </section>
    </div>
  )
}
