import { CreateClassForm } from '@/components/onboarding/create-class-form'
import { TeacherClassSection } from '@/components/onboarding/teacher-class-section'
import { getTeacherClasses } from '@/lib/class/actions'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { GraduationCap } from 'lucide-react'

interface TeacherOnboardingProps {
  fullName: string
}

export async function TeacherOnboarding({ fullName }: TeacherOnboardingProps) {
  const classes = await getTeacherClasses()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950">
            <GraduationCap className="size-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quản lý lớp học</h1>
            <p className="text-sm text-muted-foreground">Xin chào, {fullName}</p>
          </div>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11">
            Đăng xuất
          </Button>
        </form>
      </div>

      {/* Create class form */}
      <div className="mt-8">
        <CreateClassForm />
      </div>

      {/* Class list */}
      {classes.length > 0 ? (
        <div className="mt-8 space-y-6">
          {classes.map((c) => (
            <TeacherClassSection key={c.id} classroom={c} />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <GraduationCap className="size-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Chưa có lớp nào. Tạo lớp đầu tiên ở trên.</p>
        </div>
      )}
    </div>
  )
}
