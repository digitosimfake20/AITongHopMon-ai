import { BookOpen } from 'lucide-react'
import { resolveStudentContext } from '@/lib/dashboard/context'
import { getQuizBankForStudent } from '@/lib/quiz/quiz-bank-queries'
import { QuizzesListClient } from '@/components/student/quizzes-list-client'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function QuizzesPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const { user, classroom } = await resolveStudentContext()
  const quizzes = await getQuizBankForStudent(classroom.id, user.id)
  const defaultTab = tab === 'later' ? 'later' : 'all'

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

      <QuizzesListClient quizzes={quizzes} defaultTab={defaultTab} />
    </main>
  )
}
