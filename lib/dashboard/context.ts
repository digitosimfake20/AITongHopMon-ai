import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { resolveStudentClassId, resolveTeacherClassId } from '@/lib/class/resolve-class-id'
import { computeStreakDays } from '@/lib/dashboard/streak'
import prisma from '@/lib/prisma'
import { getInitials } from '@/lib/utils/initials'

type ClassroomRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.classroom.findFirst>>
>

export interface StudentShellContext {
  studentName: string
  initials: string
  classLabel: string
  classId: string
  masteryScore: number
  streakDays: number
}

export interface TeacherShellContext {
  teacherName: string
  initials: string
  className: string
  classId: string
  subject: string
  studentCount: number
}

async function resolveClassId(role: 'student' | 'teacher', userId: string): Promise<string> {
  return role === 'student'
    ? resolveStudentClassId(userId)
    : resolveTeacherClassId(userId)
}

export const resolveStudentContext = cache(async (): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
  classroom: ClassroomRecord
  shell: StudentShellContext
}> => {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/onboarding')

  const classId = await resolveClassId('student', user.id)
  const membership = await prisma.classMember.findFirst({
    where: { studentId: user.id, classId },
    include: { class: true },
  })

  if (!membership) redirect('/onboarding')

  const [masteryStates, streakSubs] = await Promise.all([
    prisma.studentKnowledgeState.findMany({
      where: { studentId: user.id },
      select: { pMastery: true },
    }),
    prisma.submission.findMany({
      where: { studentId: user.id },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      take: 90,
    }),
  ])

  const masteryScore =
    masteryStates.length > 0
      ? Math.round(
          (masteryStates.reduce(
            (sum: number, state: { pMastery: unknown }) => sum + Number(state.pMastery),
            0,
          ) /
            masteryStates.length) *
            10 *
            10,
        ) / 10
      : 0

  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName

  return {
    user,
    classroom: membership.class,
    shell: {
      studentName: firstName,
      initials: getInitials(user.fullName),
      classLabel: membership.class.name,
      classId: membership.class.id,
      masteryScore,
      streakDays: computeStreakDays(streakSubs.map((s) => s.submittedAt)),
    },
  }
})

export const resolveTeacherContext = cache(async (): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
  classroom: ClassroomRecord & { _count: { members: number } }
  shell: TeacherShellContext
}> => {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/onboarding')

  const classId = await resolveClassId('teacher', user.id)
  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
    include: { _count: { select: { members: true } } },
  })

  if (!classroom) redirect('/onboarding')

  return {
    user,
    classroom,
    shell: {
      teacherName: user.fullName,
      initials: getInitials(user.fullName),
      className: classroom.name,
      classId: classroom.id,
      subject: 'Môn Toán',
      studentCount: classroom._count.members,
    },
  }
})
