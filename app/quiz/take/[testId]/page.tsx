import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getQuizForTaking } from '@/lib/quiz/quiz-bank-queries'
import { QuizTaker } from '@/components/quiz/quiz-taker'

interface PageProps {
  params: Promise<{ testId: string }>
}

export default async function QuizTakePage({ params }: PageProps) {
  const { testId } = await params

  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/teacher')

  const quizData = await getQuizForTaking(testId, user.id)
  if (!quizData) notFound()

  return (
    <div className="min-h-screen bg-background">
      <QuizTaker data={quizData} />
    </div>
  )
}
