import { BookOpen } from 'lucide-react'
import { resolveStudentContext } from '@/lib/dashboard/context'
import { getQuizBankForStudent } from '@/lib/quiz/quiz-bank-queries'
import { QuizCard } from '@/components/student/quiz-card'

export default async function QuizzesPage() {
  const { user, classroom } = await resolveStudentContext()
  const quizzes = await getQuizBankForStudent(classroom.id, user.id)

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" aria-hidden />
        <h1 className="text-xl font-bold text-foreground">Ngân hàng đề kiểm tra</h1>
        {quizzes.length > 0 && (
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {quizzes.length} đề
          </span>
        )}
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground/50" aria-hidden />
          <p className="mt-4 font-medium text-muted-foreground">
            Chưa có bài kiểm tra nào được giao.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hãy quay lại sau nhé!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.classTestId ?? quiz.testId} quiz={quiz} />
          ))}
        </div>
      )}
    </main>
  )
}
