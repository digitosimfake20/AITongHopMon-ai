import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSelectedClassId } from '@/lib/class/selected-class'

/**
 * Resolve the active class for a student.
 * Cookie is validated against class_members — stale cookies from another class are ignored.
 */
export async function resolveStudentClassId(userId: string): Promise<string> {
  const cookieClassId = await getSelectedClassId()

  if (cookieClassId) {
    const membership = await prisma.classMember.findFirst({
      where: { studentId: userId, classId: cookieClassId },
      select: { classId: true },
    })
    if (membership) return membership.classId
  }

  const latest = await prisma.classMember.findFirst({
    where: { studentId: userId },
    orderBy: { joinedAt: 'desc' },
    select: { classId: true },
  })
  if (!latest) redirect('/onboarding')
  return latest.classId
}

/**
 * Resolve the active class for a teacher.
 * Cookie is validated against classes.teacher_id — prevents cross-teacher bleed.
 */
export async function resolveTeacherClassId(userId: string): Promise<string> {
  const cookieClassId = await getSelectedClassId()

  if (cookieClassId) {
    const owned = await prisma.classroom.findFirst({
      where: { id: cookieClassId, teacherId: userId },
      select: { id: true },
    })
    if (owned) return owned.id
  }

  const latest = await prisma.classroom.findFirst({
    where: { teacherId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!latest) redirect('/onboarding')
  return latest.id
}
