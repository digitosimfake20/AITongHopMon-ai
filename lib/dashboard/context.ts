import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getSelectedClassId } from '@/lib/class/selected-class'
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

async function resolveClassId(): Promise<string> {
  const classId = await getSelectedClassId()
  if (!classId) redirect('/onboarding')
  return classId
}

export const resolveStudentContext = cache(async (): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
  classroom: ClassroomRecord
  shell: StudentShellContext
}> => {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/onboarding')

  const classId = await resolveClassId()
  const membership = await prisma.classMember.findFirst({
    where: { studentId: user.id, classId },
    include: { class: true },
  })

  if (!membership) redirect('/onboarding')

  const masteryStates = await prisma.studentKnowledgeState.findMany({
    where: { studentId: user.id },
    select: { pMastery: true },
  })

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
      streakDays: 0,
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

  const classId = await resolveClassId()
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
