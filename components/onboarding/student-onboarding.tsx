import { BookOpen } from 'lucide-react'
import { ClassCard } from '@/components/onboarding/class-card'
import { JoinClassForm } from '@/components/onboarding/join-class-form'
import { getStudentClasses } from '@/lib/class/actions'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

interface StudentOnboardingProps {
  fullName: string
}

export async function StudentOnboarding({ fullName }: StudentOnboardingProps) {
  const classes = await getStudentClasses()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {fullName}</h1>
          <p className="mt-1 text-muted-foreground">Chọn lớp hoặc tham gia lớp mới</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11">
            Đăng xuất
          </Button>
        </form>
      </div>

      {classes.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <ClassCard
              key={c.id}
              classroom={c}
              href={`/dashboard?class=${c.id}`}
              canLeave
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Bạn chưa tham gia lớp nào</p>
        </div>
      )}

      <div className="mt-8">
        <JoinClassForm />
      </div>
    </div>
  )
}
