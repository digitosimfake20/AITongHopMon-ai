import { ClassCard } from '@/components/onboarding/class-card'
import { CreateClassForm } from '@/components/onboarding/create-class-form'
import { TeacherClassManage } from '@/components/onboarding/teacher-class-manage'
import { getTeacherClasses } from '@/lib/class/actions'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

interface TeacherOnboardingProps {
  fullName: string
}

export async function TeacherOnboarding({ fullName }: TeacherOnboardingProps) {
  const classes = await getTeacherClasses()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý lớp học</h1>
          <p className="mt-1 text-muted-foreground">Xin chào, {fullName}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11">
            Đăng xuất
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <CreateClassForm />
      </div>

      {classes.length > 0 ? (
        <div className="mt-8 space-y-6">
          {classes.map((c) => (
            <div key={c.id} className="space-y-3">
              <ClassCard classroom={c} href={`/teacher?class=${c.id}`} />
              <TeacherClassManage
                classId={c.id}
                name={c.name}
                code={c.code}
                maxCapacity={c.maxCapacity}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-muted-foreground">
          Chưa có lớp nào. Tạo lớp đầu tiên ở trên.
        </p>
      )}
    </div>
  )
}
