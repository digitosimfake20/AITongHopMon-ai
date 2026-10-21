import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getQuizForTaking } from '@/lib/quiz/quiz-bank-queries'
import { QuizTakeClient } from '@/components/quiz/quiz-take-client'
import { AccessBlockedPage } from '@/components/ui/access-blocked-page'

interface PageProps {
  params: Promise<{ testId: string }>
}

export default async function QuizTakePage({ params }: PageProps) {
  const { testId } = await params

  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/teacher')

  const quizData = await getQuizForTaking(testId, user.id)
  if (!quizData) {
    return (
      <AccessBlockedPage
        title="Không mở được bài kiểm tra"
        description="Bài có thể chưa được giao, đã hết hạn, hoặc liên kết không đúng. Kiểm tra lại trong Ngân hàng đề."
        backHref="/quizzes"
        backLabel="Về ngân hàng đề"
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizTakeClient data={quizData} />
    </div>
  )
}
