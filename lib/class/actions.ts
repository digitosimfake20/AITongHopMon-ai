'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { generateClassCode, isValidClassCode, normalizeClassCode } from '@/lib/class/code'
import prisma from '@/lib/prisma'
import {
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from '@/lib/validations/auth'

export interface ClassSummary {
  id: string
  name: string
  code: string
  maxCapacity: number
  memberCount: number
  role: 'teacher' | 'student'
}

async function requireUser() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

export async function getStudentClasses(): Promise<ClassSummary[]> {
  const user = await requireUser()
  const memberships = await prisma.classMember.findMany({
    where: { studentId: user.id },
    include: {
      class: { include: { _count: { select: { members: true } } } },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return memberships.map((m) => ({
    id: m.class.id,
    name: m.class.name,
    code: m.class.code,
    maxCapacity: m.class.maxCapacity,
    memberCount: m.class._count.members,
    role: 'student',
  }))
}

export async function getTeacherClasses(): Promise<ClassSummary[]> {
  const user = await requireUser()
  const classes = await prisma.classroom.findMany({
    where: { teacherId: user.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    maxCapacity: c.maxCapacity,
    memberCount: c._count.members,
    role: 'teacher',
  }))
}

export async function joinClassAction(codeInput: string): Promise<ActionResult> {
  const user = await requireUser()
  if (user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới có thể tham gia lớp' }
  }

  const code = normalizeClassCode(codeInput)
  const parsed = joinClassSchema.safeParse({ code })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Mã lớp không hợp lệ' }
  }

  const classroom = await prisma.classroom.findUnique({ where: { code } })
  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp với mã này' }
  }

  const memberCount = await prisma.classMember.count({
    where: { classId: classroom.id },
  })

  if (memberCount >= classroom.maxCapacity) {
    return { success: false, error: 'Lớp đã đủ sĩ số' }
  }

  await prisma.classMember.upsert({
    where: {
      classId_studentId: { classId: classroom.id, studentId: user.id },
    },
    create: { classId: classroom.id, studentId: user.id },
    update: {},
  })

  revalidatePath('/onboarding')
  return { success: true }
}

async function uniqueClassCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateClassCode()
    if (isValidClassCode(code)) {
      const exists = await prisma.classroom.findUnique({ where: { code } })
      if (!exists) return code
    }
  }
  throw new Error('Could not generate unique class code')
}

export async function createClassAction(
  formData: FormData,
): Promise<ActionResult<{ code: string }>> {
  const user = await requireUser()
  if (user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể tạo lớp' }
  }

  const parsed = createClassSchema.safeParse({
    name: formData.get('name'),
    maxCapacity: formData.get('maxCapacity'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const code = await uniqueClassCode()
  await prisma.classroom.create({
    data: {
      name: parsed.data.name,
      maxCapacity: parsed.data.maxCapacity,
      code,
      teacherId: user.id,
    },
  })

  revalidatePath('/onboarding')
  return { success: true, data: { code } }
}

export async function updateClassAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = updateClassSchema.safeParse({
    classId: formData.get('classId'),
    name: formData.get('name'),
    maxCapacity: formData.get('maxCapacity'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: parsed.data.classId, teacherId: user.id },
  })

  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền' }
  }

  await prisma.classroom.update({
    where: { id: parsed.data.classId },
    data: {
      name: parsed.data.name,
      maxCapacity: parsed.data.maxCapacity,
    },
  })

  revalidatePath('/onboarding')
  return { success: true }
}

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  const user = await requireUser()
  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })

  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền' }
  }

  await prisma.classroom.delete({ where: { id: classId } })
  revalidatePath('/onboarding')
  return { success: true }
}

export async function removeStudentAction(
  classId: string,
  studentId: string,
): Promise<ActionResult> {
  const user = await requireUser()
  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })

  if (!classroom) {
    return { success: false, error: 'Không có quyền quản lý lớp này' }
  }

  await prisma.classMember.deleteMany({
    where: { classId, studentId },
  })

  revalidatePath('/onboarding')
  return { success: true }
}

export async function getClassRoster(classId: string) {
  const user = await requireUser()
  const classroom = await prisma.classroom.findFirst({
    where: {
      id: classId,
      OR: [{ teacherId: user.id }, { members: { some: { studentId: user.id } } }],
    },
    include: {
      members: {
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!classroom) return null

  return {
    id: classroom.id,
    name: classroom.name,
    code: classroom.code,
    maxCapacity: classroom.maxCapacity,
    isTeacher: classroom.teacherId === user.id,
    members: classroom.members.map((m) => m.student),
  }
}
