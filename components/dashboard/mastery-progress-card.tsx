import { MasteryRing } from '@/components/dashboard/mastery-ring'

interface MasteryProgressCardProps {
  percent: number
  completedQuizzes: number
  studyHours: number
}

export function MasteryProgressCard({
  percent,
  completedQuizzes,
  studyHours,
}: MasteryProgressCardProps) {
  return (
    <article className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(0,0,0,0.18)]">
      <h2 className="w-full text-base font-semibold text-card-foreground">
        Mức độ Thành thạo
      </h2>
      <MasteryRing value={percent} className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        Đã làm: {completedQuizzes} bài
        <span className="mx-2 text-border">•</span>
        Thời gian: {studyHours} giờ
      </p>
    </article>
  )
}
