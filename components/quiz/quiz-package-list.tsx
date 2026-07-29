import { QuizPackageCard } from '@/components/quiz/quiz-package-card'
import type { QuizPackageSummary } from '@/lib/quiz/queries'

interface QuizPackageListProps {
  packages: QuizPackageSummary[]
}

export function QuizPackageList({ packages }: QuizPackageListProps) {
  if (packages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Chưa có đề kiểm tra nào. Tạo đề đầu tiên ở form bên dưới.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => (
        <QuizPackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  )
}
