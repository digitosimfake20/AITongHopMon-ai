import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { QuizEditor, type QuizEditorInitialData } from '@/components/quiz/QuizEditor'
import { getSessionUser } from '@/lib/auth/session'
import { getQuizPackageForEdit } from '@/lib/quiz/queries'
import type { DifficultyLevel } from '@/lib/quiz/types'

interface PageProps {
  params: Promise<{ packageId: string }>
}

export default async function EditQuizPage({ params }: PageProps) {
  const { packageId } = await params

  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/student')

  const pkg = await getQuizPackageForEdit(packageId, user.id)
  if (!pkg) notFound()

  // Build initialData from the loaded package
  let initialData: QuizEditorInitialData

  if (pkg.mode === 'STANDARD') {
    const test = pkg.tests[0]
    initialData = {
      mode: 'STANDARD',
      title: pkg.title,
      subject: test?.subject ?? 'Toán',
      topic: test?.topic ?? '',
      timeLimitMinutes: test?.timeLimitMinutes ?? 15,
      questions: test?.questions ?? [],
    }
  } else {
    const findTier = (level: DifficultyLevel) =>
      pkg.tests.find((t) => t.difficultyLevel === level) ?? {
        timeLimitMinutes: 15,
        questions: [],
        subject: 'Toán',
        topic: '',
      }

    const easy = findTier('EASY')
    const medium = findTier('MEDIUM')
    const hard = findTier('HARD')

    initialData = {
      mode: 'ADAPTIVE_PACKAGE',
      title: pkg.title,
      description: pkg.description ?? '',
      subject: easy.subject ?? medium.subject ?? 'Toán',
      topic: easy.topic ?? medium.topic ?? '',
      tiers: {
        EASY: { timeLimitMinutes: easy.timeLimitMinutes, questions: easy.questions },
        MEDIUM: { timeLimitMinutes: medium.timeLimitMinutes, questions: medium.questions },
        HARD: { timeLimitMinutes: hard.timeLimitMinutes, questions: hard.questions },
      },
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>
        <h1 className="text-xl font-bold text-foreground">Chỉnh sửa đề kiểm tra</h1>
      </div>

      <QuizEditor classId={pkg.classId} packageId={packageId} initialData={initialData} />
    </div>
  )
}
