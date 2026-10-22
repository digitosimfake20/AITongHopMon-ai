'use server'

import { revalidatePath } from 'next/cache'
import { invalidateAfterAssign, invalidateTestBank } from '@/lib/cache/invalidate'
import { redirect } from 'next/navigation'
import type { DifficultyLevel, Prisma } from '@prisma/client'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import prisma, { prismaDirect } from '@/lib/prisma'
import { fetchTestGroupSummaries } from '@/lib/test-bank/queries'
import { difficultyLabel, recommendRound2Difficulty } from '@/lib/adaptive/adaptive-logic'
import { explainAdaptiveRound2Decision } from '@/lib/adaptive/adaptive-round2-decision'
import { assessQuestionTiming, type QuestionTimingQuality } from '@/lib/quiz/question-timing'
import {
  createQuestionsInTransaction,
  materializeSystemTestInTransaction,
  MATERIALIZE_TEST_TX_OPTIONS,
} from '@/lib/system-test/materialize-questions'
import {
  assignAdaptiveGroupSchema,
  publishTestGroupSchema,
  updateTestGroupSchema,
  type PublishTestGroupInput,
} from '@/lib/validations/test-group'
import { systemTestQuestionsToTierDraft, type TestDraft } from '@/lib/system-test/test-draft'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestGroupSummary {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  description: string | null
  easyQuestionCount: number
  mediumQuestionCount: number
  hardQuestionCount: number
  durationMinutes: number
  assignedClassCount: number
  createdAt: string
}

export interface TestGroupEditData {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  description: string | null
  durationMinutes: number
  easyDraft: TestDraft
  mediumDraft: TestDraft
  hardDraft: TestDraft
  assignedClassCount: number
}

export interface AdaptiveAssignmentSummary {
  classTestId: string
  title: string
  subject: string
  topic: string
  classId: string
  startTime: string
  endTime: string
  passScoreThreshold: number
  lowScoreThreshold: number
  studentCompletedCount: number
  studentTotalCount: number
}

export interface AdaptiveStudentRow {
  studentId: string
  fullName: string
  round1Score: number | null
  round1SubmissionId: string | null
  round2Difficulty: DifficultyLevel | null
  round2Score: number | null
  round2SubmissionId: string | null
  status: 'not_started' | 'round1_done' | 'completed'
  evaluation: string
  /** Deterministic routing explanation (score + median ms per question) */
  round2DecisionSummary: string | null
  round2DecisionBranches: Array<{ id: string; label: string; taken: boolean }> | null
  medianRound1ResponseMs: number | null
  timingQuality: QuestionTimingQuality | null
  decisionMatchesStored: boolean
}

// ---------------------------------------------------------------------------
// Helpers — see lib/system-test/materialize-questions.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Admin: publish adaptive test group
// ---------------------------------------------------------------------------

export async function publishTestGroupAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Chỉ Admin mới có thể đăng cụm đề' }
  }

  const parsed = publishTestGroupSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const data = parsed.data

  try {
    const group = await prismaDirect.$transaction(async (tx) => {
      const createdGroup = await tx.testGroup.create({
        data: {
          title: data.title.trim(),
          subject: data.subject.trim() || 'Toán',
          grade: data.grade.trim() || '8',
          topic: data.topic.trim(),
          description: data.description?.trim() || null,
        },
        select: { id: true },
      })

      const tiers: Array<{ difficulty: DifficultyLevel; payload: PublishTestGroupInput['easyJson'] }> = [
        { difficulty: 'EASY', payload: data.easyJson },
        { difficulty: 'MEDIUM', payload: data.mediumJson },
        { difficulty: 'HARD', payload: data.hardJson },
      ]

      for (const tier of tiers) {
        await tx.systemTest.create({
          data: {
            title: `${data.title.trim()} — ${tier.difficulty === 'EASY' ? 'Dễ' : tier.difficulty === 'MEDIUM' ? 'TB' : 'Khó'}`,
            subject: data.subject.trim() || 'Toán',
            grade: data.grade.trim() || '8',
            durationMinutes: tier.payload.durationMinutes,
            questionCount: tier.payload.questions.length,
            questions: tier.payload.questions as Prisma.InputJsonValue,
            isSystem: true,
            groupId: createdGroup.id,
            difficulty: tier.difficulty,
            createdBy: user.id,
          },
        })
      }

      return createdGroup
    })

    invalidateTestBank()
    revalidatePath('/admin/test-bank')
    revalidatePath('/teacher/test-bank')
    return { success: true, data: { id: group.id } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể tạo cụm đề'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// List test groups
// ---------------------------------------------------------------------------

export async function listTestGroupsAction(filters?: {
  subject?: string
  grade?: string
}): Promise<ActionResult<TestGroupSummary[]>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Không có quyền' }
  }

  const groups = await fetchTestGroupSummaries(filters)

  return {
    success: true,
    data: groups,
  }
}

export async function getTestGroups(filters?: {
  subject?: string
  grade?: string
}): Promise<TestGroupSummary[]> {
  const result = await listTestGroupsAction(filters)
  return result.success && result.data ? result.data : []
}

// ---------------------------------------------------------------------------
// Teacher: assign adaptive group to class
// ---------------------------------------------------------------------------

export async function assignAdaptiveGroupAction(
  input: unknown,
): Promise<ActionResult<{ classTestId: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Chỉ giáo viên mới có thể giao đề' }
  }

  const parsed = assignAdaptiveGroupSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const {
    testGroupId,
    classId,
    startTime,
    endTime,
    passScoreThreshold,
    lowScoreThreshold,
    allowReview,
  } = parsed.data

  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })
  if (!classroom) {
    return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền giao bài' }
  }

  const group = await prisma.testGroup.findUnique({
    where: { id: testGroupId },
    include: { systemTests: true },
  })
  if (!group || group.systemTests.length !== 3) {
    return { success: false, error: 'Cụm đề không hợp lệ (cần đủ 3 cấp độ)' }
  }

  const easySt = group.systemTests.find((s) => s.difficulty === 'EASY')
  const mediumSt = group.systemTests.find((s) => s.difficulty === 'MEDIUM')
  const hardSt = group.systemTests.find((s) => s.difficulty === 'HARD')
  if (!easySt || !mediumSt || !hardSt) {
    return { success: false, error: 'Cụm đề thiếu một trong ba cấp độ EASY/MEDIUM/HARD' }
  }

  try {
    const result = await prismaDirect.$transaction(async (tx) => {
      const easyTest = await materializeSystemTestInTransaction(
        tx, easySt, classId, 'EASY', 'EASY', user.id, 'Dễ',
      )
      const mediumTest = await materializeSystemTestInTransaction(
        tx, mediumSt, classId, 'MEDIUM', 'MEDIUM', user.id, 'TB',
      )
      const hardTest = await materializeSystemTestInTransaction(
        tx, hardSt, classId, 'HARD', 'HARD', user.id, 'Khó',
      )

      const classTest = await tx.classTest.create({
        data: {
          classId,
          testGroupId,
          isAdaptive: true,
          easyTestId: easyTest.id,
          mediumTestId: mediumTest.id,
          hardTestId: hardTest.id,
          startTime,
          endTime,
          maxAttempts: 2,
          allowReview,
          passScoreThreshold,
          lowScoreThreshold,
        },
        select: { id: true },
      })

      return { classTestId: classTest.id }
    }, MATERIALIZE_TEST_TX_OPTIONS)

    invalidateAfterAssign(classId)
    revalidatePath('/teacher/test-bank')
    revalidatePath('/teacher/adaptive')
    revalidatePath('/quizzes')
    revalidatePath('/dashboard')
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể giao cụm đề'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Teacher: list adaptive assignments for a class
// ---------------------------------------------------------------------------

export async function listAdaptiveAssignmentsAction(
  classId: string,
): Promise<ActionResult<AdaptiveAssignmentSummary[]>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Không có quyền' }
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không tìm thấy lớp' }

  const [assignments, memberCount] = await prisma.$transaction([
    prisma.classTest.findMany({
      where: { classId, isAdaptive: true },
      include: {
        testGroup: { select: { title: true, subject: true, topic: true } },
        adaptiveSessions: {
          where: { round2SubmissionId: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classMember.count({ where: { classId } }),
  ])

  return {
    success: true,
    data: assignments.map((a) => ({
      classTestId: a.id,
      title: a.testGroup?.title ?? 'Cụm đề phân hóa',
      subject: a.testGroup?.subject ?? 'Toán',
      topic: a.testGroup?.topic ?? '',
      classId: a.classId,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      passScoreThreshold: a.passScoreThreshold,
      lowScoreThreshold: a.lowScoreThreshold,
      studentCompletedCount: a.adaptiveSessions.length,
      studentTotalCount: memberCount,
    })),
  }
}

// ---------------------------------------------------------------------------
// Teacher: adaptive summary for one assignment
// ---------------------------------------------------------------------------

export async function getAdaptiveSummaryAction(
  classTestId: string,
): Promise<
  ActionResult<{
    assignment: AdaptiveAssignmentSummary
    students: AdaptiveStudentRow[]
  }>
> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Không có quyền' }
  }

  const classTest = await prisma.classTest.findUnique({
    where: { id: classTestId },
    include: {
      testGroup: true,
      class: { select: { id: true, teacherId: true, name: true } },
      adaptiveSessions: true,
    },
  })

  if (!classTest?.isAdaptive || !classTest.testGroup) {
    return { success: false, error: 'Không tìm thấy bài giao phân hóa' }
  }
  if (classTest.class.teacherId !== user.id && user.role !== 'admin') {
    return { success: false, error: 'Không có quyền xem bài giao này' }
  }

  const members = await prisma.classMember.findMany({
    where: { classId: classTest.classId },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { student: { fullName: 'asc' } },
  })

  const sessionByStudent = new Map(classTest.adaptiveSessions.map((s) => [s.studentId, s]))

  const submissionIds = classTest.adaptiveSessions.flatMap((s) =>
    [s.round1SubmissionId, s.round2SubmissionId].filter(Boolean) as string[],
  )
  const submissions =
    submissionIds.length > 0
      ? await prisma.submission.findMany({
          where: { id: { in: submissionIds } },
          select: { id: true, score: true, timeSpentSeconds: true },
        })
      : []
  const scoreBySubId = new Map(submissions.map((s) => [s.id, Number(s.score)]))
  const totalSecondsBySubId = new Map(submissions.map((s) => [s.id, s.timeSpentSeconds]))

  const round1SubIds = classTest.adaptiveSessions
    .map((s) => s.round1SubmissionId)
    .filter(Boolean) as string[]

  const timingByRound1SubId = new Map<string, ReturnType<typeof assessQuestionTiming>>()
  if (round1SubIds.length > 0) {
    const detailRows = await prisma.submissionDetail.findMany({
      where: { submissionId: { in: round1SubIds } },
      select: { submissionId: true, timeSpentSeconds: true },
    })
    const timesBySub = new Map<string, number[]>()
    for (const row of detailRows) {
      const list = timesBySub.get(row.submissionId) ?? []
      list.push(row.timeSpentSeconds)
      timesBySub.set(row.submissionId, list)
    }
    for (const subId of round1SubIds) {
      const times = timesBySub.get(subId) ?? []
      timingByRound1SubId.set(
        subId,
        assessQuestionTiming({
          perQuestionSeconds: times,
          totalSeconds: totalSecondsBySubId.get(subId) ?? null,
          questionCount: times.length,
        }),
      )
    }
  }

  const { buildAdaptiveEvaluation } = await import('@/lib/adaptive/adaptive-logic')

  const students: AdaptiveStudentRow[] = members.map(({ student }) => {
    const session = sessionByStudent.get(student.id) ?? null
    const round1Score = session?.round1SubmissionId
      ? (scoreBySubId.get(session.round1SubmissionId) ?? null)
      : null
    const round2Score = session?.round2SubmissionId
      ? (scoreBySubId.get(session.round2SubmissionId) ?? null)
      : null

    let status: AdaptiveStudentRow['status'] = 'not_started'
    if (session?.round2SubmissionId) status = 'completed'
    else if (session?.round1SubmissionId) status = 'round1_done'

    const timing = session?.round1SubmissionId
      ? (timingByRound1SubId.get(session.round1SubmissionId) ?? null)
      : null

    const decisionTrace =
      round1Score != null
        ? explainAdaptiveRound2Decision(round1Score, classTest.passScoreThreshold, {
            medianResponseMs: timing?.medianMs ?? null,
            reliable: timing?.reliable ?? false,
          })
        : null

    const storedDifficulty = session?.round2Difficulty ?? null
    const decisionMatchesStored =
      !storedDifficulty || !decisionTrace || decisionTrace.difficulty === storedDifficulty
    const round2DecisionSummary = !decisionTrace
      ? null
      : decisionMatchesStored
        ? decisionTrace.summaryVi
        : `Đã giao đề ${difficultyLabel(storedDifficulty)}. Không đủ dữ liệu để xác minh quyết định lịch sử.`

    return {
      studentId: student.id,
      fullName: student.fullName,
      round1Score,
      round1SubmissionId: session?.round1SubmissionId ?? null,
      round2Difficulty: session?.round2Difficulty ?? null,
      round2Score,
      round2SubmissionId: session?.round2SubmissionId ?? null,
      status,
      evaluation: buildAdaptiveEvaluation(
        round1Score,
        session?.round2Difficulty ?? null,
        round2Score,
        classTest.passScoreThreshold,
      ),
      round2DecisionSummary,
      round2DecisionBranches: decisionMatchesStored ? (decisionTrace?.branches ?? null) : null,
      medianRound1ResponseMs: timing?.reliable ? (timing.medianMs ?? null) : null,
      timingQuality: timing?.quality ?? null,
      decisionMatchesStored,
    }
  })

  const assignment: AdaptiveAssignmentSummary = {
    classTestId: classTest.id,
    title: classTest.testGroup.title,
    subject: classTest.testGroup.subject,
    topic: classTest.testGroup.topic,
    classId: classTest.classId,
    startTime: classTest.startTime.toISOString(),
    endTime: classTest.endTime.toISOString(),
    passScoreThreshold: classTest.passScoreThreshold,
    lowScoreThreshold: classTest.lowScoreThreshold,
    studentCompletedCount: students.filter((s) => s.status === 'completed').length,
    studentTotalCount: members.length,
  }

  return { success: true, data: { assignment, students } }
}

// ---------------------------------------------------------------------------
// Admin: get test group for editing
// ---------------------------------------------------------------------------

export async function getTestGroupForEditAction(
  groupId: string,
): Promise<ActionResult<TestGroupEditData>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Không có quyền' }
  }

  const group = await prisma.testGroup.findUnique({
    where: { id: groupId },
    include: {
      systemTests: true,
      _count: { select: { classTests: true } },
    },
  })

  if (!group || group.systemTests.length !== 3) {
    return { success: false, error: 'Không tìm thấy cụm đề hoặc thiếu cấp độ' }
  }

  const easySt = group.systemTests.find((s) => s.difficulty === 'EASY')
  const mediumSt = group.systemTests.find((s) => s.difficulty === 'MEDIUM')
  const hardSt = group.systemTests.find((s) => s.difficulty === 'HARD')
  if (!easySt || !mediumSt || !hardSt) {
    return { success: false, error: 'Cụm đề thiếu một trong ba cấp độ EASY/MEDIUM/HARD' }
  }

  const groupMeta = {
    title: group.title,
    subject: group.subject,
    grade: group.grade,
    durationMinutes: mediumSt.durationMinutes,
  }

  const easyParsed = systemTestQuestionsToTierDraft(
    { ...easySt, title: `${group.title} — Dễ` },
    { ...groupMeta, title: `${group.title} — Dễ` },
  )
  const mediumParsed = systemTestQuestionsToTierDraft(
    { ...mediumSt, title: `${group.title} — TB` },
    { ...groupMeta, title: `${group.title} — TB` },
  )
  const hardParsed = systemTestQuestionsToTierDraft(
    { ...hardSt, title: `${group.title} — Khó` },
    { ...groupMeta, title: `${group.title} — Khó` },
  )

  if (!easyParsed.ok) return { success: false, error: `EASY: ${easyParsed.error}` }
  if (!mediumParsed.ok) return { success: false, error: `MEDIUM: ${mediumParsed.error}` }
  if (!hardParsed.ok) return { success: false, error: `HARD: ${hardParsed.error}` }

  return {
    success: true,
    data: {
      id: group.id,
      title: group.title,
      subject: group.subject,
      grade: group.grade,
      topic: group.topic,
      description: group.description,
      durationMinutes: mediumSt.durationMinutes,
      easyDraft: easyParsed.data,
      mediumDraft: mediumParsed.data,
      hardDraft: hardParsed.data,
      assignedClassCount: group._count.classTests,
    },
  }
}

// ---------------------------------------------------------------------------
// Admin: update adaptive test group
// ---------------------------------------------------------------------------

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export async function updateTestGroupAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Chỉ Admin mới có thể sửa cụm đề' }
  }

  const parsed = updateTestGroupSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }
  }

  const data = parsed.data

  const existing = await prisma.testGroup.findUnique({
    where: { id: data.groupId },
    include: { systemTests: true },
  })
  if (!existing || existing.systemTests.length !== 3) {
    return { success: false, error: 'Không tìm thấy cụm đề' }
  }

  const tierMap = {
    EASY: existing.systemTests.find((s) => s.difficulty === 'EASY'),
    MEDIUM: existing.systemTests.find((s) => s.difficulty === 'MEDIUM'),
    HARD: existing.systemTests.find((s) => s.difficulty === 'HARD'),
  }
  if (!tierMap.EASY || !tierMap.MEDIUM || !tierMap.HARD) {
    return { success: false, error: 'Cụm đề thiếu cấp độ' }
  }

  const tiers: Array<{
    difficulty: DifficultyLevel
    payload: PublishTestGroupInput['easyJson']
    systemTestId: string
    existing: (typeof existing.systemTests)[number]
  }> = [
    { difficulty: 'EASY', payload: data.easyJson, systemTestId: tierMap.EASY.id, existing: tierMap.EASY },
    { difficulty: 'MEDIUM', payload: data.mediumJson, systemTestId: tierMap.MEDIUM.id, existing: tierMap.MEDIUM },
    { difficulty: 'HARD', payload: data.hardJson, systemTestId: tierMap.HARD.id, existing: tierMap.HARD },
  ]

  try {
    const groupUpdate = prismaDirect.testGroup.update({
      where: { id: data.groupId },
      data: {
        title: data.title.trim(),
        subject: data.subject.trim() || 'Toán',
        grade: data.grade.trim() || '8',
        topic: data.topic.trim(),
        description: data.description?.trim() || null,
      },
    })

    const tierUpdates = tiers.map((tier) => {
      const tierLabel =
        tier.difficulty === 'EASY' ? 'Dễ' : tier.difficulty === 'MEDIUM' ? 'TB' : 'Khó'
      const questionsChanged = !jsonEqual(tier.payload.questions, tier.existing.questions)
      const durationChanged = tier.payload.durationMinutes !== tier.existing.durationMinutes

      return prismaDirect.systemTest.update({
        where: { id: tier.systemTestId },
        data: {
          title: `${data.title.trim()} — ${tierLabel}`,
          subject: data.subject.trim() || 'Toán',
          grade: data.grade.trim() || '8',
          ...(durationChanged ? { durationMinutes: tier.payload.durationMinutes } : {}),
          ...(questionsChanged
            ? {
                questionCount: tier.payload.questions.length,
                questions: tier.payload.questions as Prisma.InputJsonValue,
              }
            : {}),
        },
      })
    })

    await prismaDirect.$transaction([groupUpdate, ...tierUpdates])

    invalidateTestBank()
    revalidatePath('/admin/test-bank')
    revalidatePath('/teacher/test-bank')
    revalidatePath('/quizzes')
    return { success: true, data: { id: data.groupId } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể cập nhật cụm đề'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Delete test group (admin)
// ---------------------------------------------------------------------------

export async function deleteTestGroupAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return { success: false, error: 'Không có quyền' }
  }

  const assigned = await prisma.classTest.count({ where: { testGroupId: id } })
  if (assigned > 0) {
    return {
      success: false,
      error: `Cụm đề đã được giao cho ${assigned} lớp. Không thể xóa.`,
    }
  }

  await prisma.testGroup.delete({ where: { id } })
  invalidateTestBank()
  revalidatePath('/admin/test-bank')
  revalidatePath('/teacher/test-bank')
  return { success: true }
}

// ---------------------------------------------------------------------------
// After round-1 submit: upsert adaptive session with round-2 recommendation
// ---------------------------------------------------------------------------

export async function recordAdaptiveRound1Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
  round1Score: number,
  passScoreThreshold: number,
  easyTestId: string,
  hardTestId: string,
  timing?: import('@/lib/adaptive/adaptive-round2-decision').Round1TimingInput,
): Promise<void> {
  const round2Difficulty = recommendRound2Difficulty(
    round1Score,
    passScoreThreshold,
    timing,
  )
  const round2TestId = round2Difficulty === 'HARD' ? hardTestId : easyTestId
  
  await prisma.adaptiveStudentSession.upsert({
    where: { classTestId_studentId: { classTestId, studentId } },
    create: {
      classTestId,
      studentId,
      round1SubmissionId: submissionId,
      round2Difficulty,
      round2TestId,
    },
    update: {
      round1SubmissionId: submissionId,
      round2Difficulty,
      round2TestId,
    },
  })
}

export async function recordAdaptiveRound2Submit(
  classTestId: string,
  studentId: string,
  submissionId: string,
): Promise<void> {
  await prisma.adaptiveStudentSession.update({
    where: { classTestId_studentId: { classTestId, studentId } },
    data: { round2SubmissionId: submissionId },
  })
}
