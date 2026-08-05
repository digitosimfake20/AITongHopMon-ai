import { BookOpen } from 'lucide-react'
import { ClassCard } from '@/components/onboarding/class-card'
import { JoinClassForm } from '@/components/onboarding/join-class-form'
import { StudentRosterStatus } from '@/components/student/student-roster-status'
import { getStudentClasses } from '@/lib/class/actions'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import prisma from '@/lib/prisma'

interface StudentOnboardingProps {
  fullName: string
  userId: string
}

export async function StudentOnboarding({ fullName, userId }: StudentOnboardingProps) {
  const classes = await getStudentClasses()
  const classIds = classes.map((c) => c.id)

  // Load roster scoped to enrolled classes only
  const [myLinks, allRosterEntries] = classIds.length > 0
    ? await prisma.$transaction([
        prisma.classRosterEntry.findMany({
          where: { classId: { in: classIds }, linkedUserId: userId },
          include: { linkedUser: { select: { fullName: true } } },
        }),
        prisma.classRosterEntry.findMany({
          where: { classId: { in: classIds } },
          include: { linkedUser: { select: { fullName: true } } },
          orderBy: [{ classId: 'asc' }, { stt: 'asc' }],
        }),
      ])
    : [[], []]

  const rosterByClass = new Map<string, typeof allRosterEntries>()
  for (const entry of allRosterEntries) {
    const list = rosterByClass.get(entry.classId) ?? []
    list.push(entry)
    rosterByClass.set(entry.classId, list)
  }

  const rosterMap = new Map<string, {
    currentEntry: {
      id: string; stt: number; studentCode: string; fullName: string;
      linkedUserId: string | null; linkedUserName: string | null
    }
    allEntries: Array<{
      id: string; stt: number; studentCode: string; fullName: string;
      linkedUserId: string | null; linkedUserName: string | null
    }>
  }>()

  for (const link of myLinks) {
    const classRoster = rosterByClass.get(link.classId) ?? []
    rosterMap.set(link.classId, {
      currentEntry: {
        id: link.id,
        stt: link.stt,
        studentCode: link.studentCode,
        fullName: link.fullName,
        linkedUserId: link.linkedUserId,
        linkedUserName: link.linkedUser?.fullName ?? null,
      },
      allEntries: classRoster.map((e) => ({
        id: e.id,
        stt: e.stt,
        studentCode: e.studentCode,
        fullName: e.fullName,
        linkedUserId: e.linkedUserId,
        linkedUserName: e.linkedUser?.fullName ?? null,
      })),
    })
  }

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
        <div className="mt-8 space-y-4">
          {classes.map((c) => {
            const rosterInfo = rosterMap.get(c.id)
            return (
              <div key={c.id} className="space-y-2">
                <ClassCard classroom={c} href={`/dashboard?class=${c.id}`} canLeave />
                {/* Show roster status / name-change button if class has a roster */}
                {rosterInfo && (
                  <StudentRosterStatus
                    classId={c.id}
                    currentEntry={rosterInfo.currentEntry}
                    allEntries={rosterInfo.allEntries}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Bạn chưa tham gia lớp nào</p>
        </div>
      )}

      <div className="mt-8">
        <JoinClassForm currentUserId={userId} />
      </div>
    </div>
  )
}
