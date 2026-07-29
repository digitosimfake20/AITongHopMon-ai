'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import prisma from '@/lib/prisma'
import { saveQuizPackageSchema, saveQuizSchema } from '@/lib/validations/quiz'
import type { SaveQuizInput, SaveQuizPackageInput } from '@/lib/validations/quiz'

type TxClient = Prisma.TransactionClient

type QuizQuestionInput = SaveQuizInput['questions'][number]

function toDbQuestionData(question: QuizQuestionInput): {
  options: Prisma.InputJsonValue
  correctOption: string | null
} {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return {
        options: question.options,
        correctOption: String.fromCharCode(65 + question.correctAnswer),
      }
    case 'TRUE_FALSE_GROUP':
      return {
        options: question.subQuestions,
        correctOption: question.subQuestions.map((sq) => (sq.correctAnswer ? 'T' : 'F')).join(','),
      }
    case 'SHORT_ANSWER':
      return {
        options: [],
        correctOption: question.correctAnswer,
      }
    case 'ESSAY':
      return {
        options: [],
        correctOption: null,
      }
  }
}

interface CreateTestParams {
  tx: TxClient
  title: string
  classId: string
  subject: string
  topic: string
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD'
  timeLimitMinutes: number
  createdBy: string
  questions: QuizQuestionInput[]
}

async function createTestWithQuestions({
  tx,
  title,
  classId,
  subject,
  topic,
  difficultyLevel,
  timeLimitMinutes,
  createdBy,
  questions,
}: CreateTestParams): Promise<string> {
  const createdQuestions = await Promise.all(
    questions.map((question) => {
      const { options, correctOption } = toDbQuestionData(question)
      return tx.question.create({
        data: {
          subject,
          topic,
          difficulty: difficultyLevel.toLowerCase(),
          type: question.type,
          content: question.content,
          options,
          correctOption,
          explanation: question.explanation,
          points: question.points ?? 1.0,
        },
        select: { id: true },
      })
    }),
  )

  const test = await tx.test.create({
    data: {
      title,
      classId,
      questionIds: createdQuestions.map((q) => q.id),
      timeLimitMinutes,
      difficultyLevel,
      createdBy,
    },
    select: { id: true },
  })

  return test.id
}

export async function saveQuizPackageAction(
  input: unknown,
): Promise<ActionResult<{ testIds: string[]; packageId: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể tạo đề kiểm tra' }
  }

  const parsed = saveQuizPackageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const data: SaveQuizPackageInput = parsed.data

  const classroom = await prisma.classroom.findFirst({
    where: { id: data.classId, teacherId: user.id },
  })
  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền' }
  }

  const result = await prisma.$transaction(async (tx) => {
    if (data.mode === 'STANDARD') {
      const testId = await createTestWithQuestions({
        tx,
        title: data.title,
        classId: data.classId,
        subject: data.subject,
        topic: data.topic,
        difficultyLevel: 'MEDIUM',
        timeLimitMinutes: data.timeLimitMinutes,
        createdBy: user.id,
        questions: data.questions,
      })

      const pkg = await tx.quizPackage.create({
        data: {
          title: data.title,
          mode: 'STANDARD',
          classId: data.classId,
          createdBy: user.id,
          standardTestId: testId,
        },
        select: { id: true },
      })

      return { testIds: [testId], packageId: pkg.id }
    }

    const [easyId, mediumId, hardId] = await Promise.all([
      createTestWithQuestions({
        tx,
        title: `${data.title} - Dễ`,
        classId: data.classId,
        subject: data.subject,
        topic: data.topic,
        difficultyLevel: 'EASY',
        timeLimitMinutes: data.easy.timeLimitMinutes,
        createdBy: user.id,
        questions: data.easy.questions,
      }),
      createTestWithQuestions({
        tx,
        title: `${data.title} - Trung bình`,
        classId: data.classId,
        subject: data.subject,
        topic: data.topic,
        difficultyLevel: 'MEDIUM',
        timeLimitMinutes: data.medium.timeLimitMinutes,
        createdBy: user.id,
        questions: data.medium.questions,
      }),
      createTestWithQuestions({
        tx,
        title: `${data.title} - Khó`,
        classId: data.classId,
        subject: data.subject,
        topic: data.topic,
        difficultyLevel: 'HARD',
        timeLimitMinutes: data.hard.timeLimitMinutes,
        createdBy: user.id,
        questions: data.hard.questions,
      }),
    ])

    const pkg = await tx.quizPackage.create({
      data: {
        title: data.title,
        description: data.description,
        mode: 'ADAPTIVE_PACKAGE',
        classId: data.classId,
        createdBy: user.id,
        easyTestId: easyId,
        mediumTestId: mediumId,
        hardTestId: hardId,
      },
      select: { id: true },
    })

    return { testIds: [easyId, mediumId, hardId], packageId: pkg.id }
  })

  revalidatePath('/teacher/assignments')
  revalidatePath('/teacher')
  revalidatePath('/quizzes')

  return { success: true, data: result }
}

export async function deleteQuizPackageAction(packageId: string): Promise<ActionResult<null>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể xóa đề kiểm tra' }
  }

  const pkg = await prisma.quizPackage.findFirst({
    where: { id: packageId, createdBy: user.id },
  })
  if (!pkg) {
    return { success: false, error: 'Không tìm thấy đề hoặc không có quyền' }
  }

  const testIds = [pkg.standardTestId, pkg.easyTestId, pkg.mediumTestId, pkg.hardTestId].filter(
    (id): id is string => Boolean(id),
  )

  await prisma.$transaction(async (tx) => {
    await tx.quizPackage.delete({ where: { id: packageId } })
    if (testIds.length > 0) {
      await tx.test.deleteMany({ where: { id: { in: testIds } } })
    }
  })

  revalidatePath('/teacher/assignments')
  revalidatePath('/teacher')
  revalidatePath('/quizzes')

  return { success: true, data: null }
}

export async function updateQuizPackageAction(
  packageId: string,
  input: unknown,
): Promise<ActionResult<{ packageId: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể chỉnh sửa đề kiểm tra' }
  }

  const parsed = saveQuizPackageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const data: SaveQuizPackageInput = parsed.data

  const pkg = await prisma.quizPackage.findFirst({
    where: { id: packageId, createdBy: user.id },
    include: {
      standardTest: { include: { submissions: { take: 1, select: { id: true } } } },
      easyTest: { include: { submissions: { take: 1, select: { id: true } } } },
      mediumTest: { include: { submissions: { take: 1, select: { id: true } } } },
      hardTest: { include: { submissions: { take: 1, select: { id: true } } } },
    },
  })
  if (!pkg) return { success: false, error: 'Không tìm thấy đề hoặc không có quyền' }

  const allTests = [pkg.standardTest, pkg.easyTest, pkg.mediumTest, pkg.hardTest].filter(Boolean)
  if (allTests.some((t) => t && t.submissions.length > 0)) {
    return { success: false, error: 'Không thể chỉnh sửa câu hỏi sau khi đã có học sinh nộp bài' }
  }

  async function replaceTestQuestions(
    tx: TxClient,
    testId: string,
    params: {
      title: string
      subject: string
      topic: string
      difficulty: string
      timeLimitMinutes: number
      questions: QuizQuestionInput[]
    },
  ) {
    const old = await tx.test.findUnique({ where: { id: testId }, select: { questionIds: true } })
    const oldIds = Array.isArray(old?.questionIds) ? (old!.questionIds as string[]) : []
    if (oldIds.length > 0) {
      await tx.question.deleteMany({ where: { id: { in: oldIds } } })
    }
    const created = await Promise.all(
      params.questions.map((q) => {
        const { options, correctOption } = toDbQuestionData(q)
        return tx.question.create({
          data: {
            subject: params.subject,
            topic: params.topic,
            difficulty: params.difficulty,
            type: q.type,
            content: q.content,
            options,
            correctOption,
            explanation: q.explanation,
          },
          select: { id: true },
        })
      }),
    )
    await tx.test.update({
      where: { id: testId },
      data: {
        title: params.title,
        timeLimitMinutes: params.timeLimitMinutes,
        questionIds: created.map((q) => q.id),
      },
    })
  }

  await prisma.$transaction(async (tx) => {
    if (data.mode === 'STANDARD') {
      if (!pkg.standardTestId) throw new Error('Không tìm thấy đề đơn')
      await replaceTestQuestions(tx, pkg.standardTestId, {
        title: data.title,
        subject: data.subject,
        topic: data.topic,
        difficulty: 'medium',
        timeLimitMinutes: data.timeLimitMinutes,
        questions: data.questions,
      })
      await tx.quizPackage.update({ where: { id: packageId }, data: { title: data.title } })
    } else {
      const tiers = [
        { id: pkg.easyTestId, key: 'easy', level: 'EASY', label: 'Dễ', tier: data.easy },
        { id: pkg.mediumTestId, key: 'medium', level: 'MEDIUM', label: 'Trung bình', tier: data.medium },
        { id: pkg.hardTestId, key: 'hard', level: 'HARD', label: 'Khó', tier: data.hard },
      ] as const
      for (const { id, level, label, tier } of tiers) {
        if (!id) continue
        await replaceTestQuestions(tx, id, {
          title: `${data.title} - ${label}`,
          subject: data.subject,
          topic: data.topic,
          difficulty: level.toLowerCase(),
          timeLimitMinutes: tier.timeLimitMinutes,
          questions: tier.questions,
        })
      }
      await tx.quizPackage.update({
        where: { id: packageId },
        data: { title: data.title, description: data.description },
      })
    }
  })

  revalidatePath('/teacher/assignments')
  revalidatePath('/teacher')
  return { success: true, data: { packageId } }
}

/** @deprecated Use `saveQuizPackageAction` with `mode: 'STANDARD'` instead. */
export async function saveQuizAction(
  input: unknown,
): Promise<ActionResult<{ testId: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể tạo đề kiểm tra' }
  }

  const parsed = saveQuizSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const { classId, title, subject, topic, timeLimitMinutes, questions } = parsed.data

  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })
  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền' }
  }

  const testId = await prisma.$transaction((tx) =>
    createTestWithQuestions({
      tx,
      title,
      classId,
      subject,
      topic,
      difficultyLevel: 'MEDIUM',
      timeLimitMinutes,
      createdBy: user.id,
      questions,
    }),
  )

  revalidatePath('/teacher/assignments')
  revalidatePath('/teacher')
  revalidatePath('/quizzes')

  return { success: true, data: { testId } }
}
