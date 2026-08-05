'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import prisma, { prismaDirect } from '@/lib/prisma'
import {
  fetchSystemTestSummaries,
} from '@/lib/test-bank/queries'
import {
  assignClassTestSchema,
  publishSystemTestSchema,
} from '@/lib/validations/system-test'
import {
  createQuestionsInTransaction,
  MATERIALIZE_TEST_TX_OPTIONS,
} from '@/lib/system-test/materialize-questions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemTestSummary {
  id: string
  title: string
  subject: string
  grade: string
  durationMinutes: number
  questionCount: number
  isSystem: boolean
  createdAt: string
}

export interface ClassTestAssignmentResult {
  classTestId: string
  testId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Admin: publish system test from JSON
// ---------------------------------------------------------------------------

export async function publishSystemTestAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Chỉ Admin mới có thể đăng đề hệ thống' }
  }

  const parsed = publishSystemTestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'JSON không hợp lệ' }
  }

  const data = parsed.data
  const created = await prisma.systemTest.create({
    data: {
      title: data.title.trim(),
      subject: data.subject.trim() || 'Toán',
      grade: data.grade.trim() || '8',
      durationMinutes: data.durationMinutes,
      questionCount: data.questions.length,
      questions: data.questions as Prisma.InputJsonValue,
      isSystem: true,
      createdBy: user.id,
    },
    select: { id: true },
  })

  revalidatePath('/admin/test-bank')
  revalidatePath('/teacher/test-bank')
  return { success: true, data: { id: created.id } }
}

// ---------------------------------------------------------------------------
// List system tests (teacher + admin)
// ---------------------------------------------------------------------------

export async function listSystemTestsAction(filters?: {
  subject?: string
  grade?: string
}): Promise<ActionResult<SystemTestSummary[]>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Không có quyền' }
  }

  const tests = await fetchSystemTestSummaries(filters)

  return {
    success: true,
    data: tests,
  }
}

export async function getSystemTests(filters?: {
  subject?: string
  grade?: string
}): Promise<SystemTestSummary[]> {
  const result = await listSystemTestsAction(filters)
  return result.success && result.data ? result.data : []
}

// ---------------------------------------------------------------------------
// Teacher: assign system test to a class
// ---------------------------------------------------------------------------

export async function assignClassTestAction(
  input: unknown,
): Promise<ActionResult<ClassTestAssignmentResult>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Chỉ giáo viên mới có thể giao đề' }
  }

  const parsed = assignClassTestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const { systemTestId, classId, startTime, endTime, maxAttempts, allowReview } = parsed.data

  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })
  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền giao bài' }
  }

  const systemTest = await prisma.systemTest.findUnique({ where: { id: systemTestId } })
  if (!systemTest) {
    return { success: false, error: 'Không tìm thấy đề hệ thống' }
  }

  const questionsRaw = systemTest.questions
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    return { success: false, error: 'Đề hệ thống không có câu hỏi' }
  }

  const questionsParsed = publishSystemTestSchema.shape.questions.safeParse(questionsRaw)
  if (!questionsParsed.success) {
    return { success: false, error: 'Cấu trúc câu hỏi trong đề hệ thống không hợp lệ' }
  }

  try {
    const result = await prismaDirect.$transaction(async (tx) => {
      const createdQuestions = await createQuestionsInTransaction(tx, questionsParsed.data, {
        subject: systemTest.subject,
        topicFallback: systemTest.title,
        difficulty: 'medium',
      })

      const test = await tx.test.create({
        data: {
          title: systemTest.title,
          classId,
          questionIds: createdQuestions.map((q) => q.id),
          timeLimitMinutes: systemTest.durationMinutes,
          difficultyLevel: 'MEDIUM',
          createdBy: user.id,
        },
        select: { id: true },
      })

      const classTest = await tx.classTest.create({
        data: {
          classId,
          systemTestId,
          testId: test.id,
          startTime,
          endTime,
          maxAttempts,
          allowReview,
        },
        select: { id: true },
      })

      return { classTestId: classTest.id, testId: test.id }
    }, MATERIALIZE_TEST_TX_OPTIONS)

    revalidatePath('/teacher/test-bank')
    revalidatePath('/teacher/assignments')
    revalidatePath('/quizzes')
    revalidatePath('/dashboard')
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể giao đề'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Delete system test (admin)
// ---------------------------------------------------------------------------

export async function deleteSystemTestAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Không có quyền' }
  }

  const assigned = await prisma.classTest.count({ where: { systemTestId: id } })
  if (assigned > 0) {
    return {
      success: false,
      error: `Đề đã được giao cho ${assigned} lớp. Không thể xóa.`,
    }
  }

  await prisma.systemTest.delete({ where: { id } })
  revalidatePath('/admin/test-bank')
  revalidatePath('/teacher/test-bank')
  return { success: true }
}
