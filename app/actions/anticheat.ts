'use server'

import { Prisma } from '@prisma/client'
import type {
  AnticheatConsentOutcome,
  AnticheatReviewDecision,
  AnticheatTrigger,
} from '@prisma/client'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { findClassTestByTestId } from '@/lib/adaptive/find-class-test'
import { canReadSubmission } from '@/lib/quiz/submission-access'

// Phase 0 hash math: `@/lib/anticheat` (client-side). Server actions persist consent/flags only.

const MAX_FLAGS_PER_SUBMISSION = 20

const CONSENT_OUTCOMES = new Set<AnticheatConsentOutcome>(['granted', 'refused'])
const FLAG_TRIGGERS = new Set<AnticheatTrigger>([
  'frozen',
  'tab_switch',
  'histogram_delta',
  'hint',
])
const REVIEW_DECISIONS = new Set<Exclude<AnticheatReviewDecision, 'pending'>>([
  'confirmed',
  'dismissed',
])

/** UI-facing aliases (Phase 1 pretest / flags panel). */
export type ConsentDecision = 'granted' | 'refused'
export type FlagReviewDecision = 'confirmed' | 'dismissed'
export type FlagReviewStatus = AnticheatReviewDecision
export type FlagTrigger = AnticheatTrigger

export interface AnticheatFlagItem {
  id: string
  trigger: AnticheatTrigger | string
  detail: string | null
  createdAt: string
  reviewStatus: FlagReviewStatus
  clientAt?: string
}

function resolveSubmissionId(input: {
  submissionId?: string
  attemptId?: string
}): string | null {
  return input.submissionId ?? input.attemptId ?? null
}

type SubmissionAccessRow = {
  id: string
  studentId: string
  test: { class: { teacherId: string } }
}

async function loadSubmissionAccess(
  submissionId: string,
): Promise<SubmissionAccessRow | null> {
  return prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      studentId: true,
      test: { select: { class: { select: { teacherId: true } } } },
    },
  })
}

function isOwnerOrTeacherOrAdmin(
  user: { id: string; role: string },
  submission: SubmissionAccessRow,
): boolean {
  return canReadSubmission({
    role: user.role,
    callerId: user.id,
    studentId: submission.studentId,
    classTeacherId: submission.test.class.teacherId,
  })
}

function isTeacherOrAdminOfClass(
  user: { id: string; role: string },
  classTeacherId: string,
): boolean {
  if (user.role === 'admin') return true
  return user.role === 'teacher' && classTeacherId === user.id
}

// ---------------------------------------------------------------------------
// 1. Start monitored attempt
// ---------------------------------------------------------------------------

export async function startMonitoredAttemptAction(input: {
  testId: string
  /** Accepted for UI compatibility; monitoring is resolved via ClassTest lookup. */
  classTestId?: string | null
}): Promise<
  ActionResult<{
    monitoring: boolean
    submissionId?: string
    /** Alias of submissionId for Phase 1 UI session storage. */
    attemptId?: string
    attemptNumber?: number
    status?: 'IN_PROGRESS'
  }>
> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới được bắt đầu bài giám sát' }
  }

  const test = await prisma.test.findUnique({
    where: { id: input.testId },
    select: { id: true, questionIds: true },
  })
  if (!test) return { success: false, error: 'Không tìm thấy đề kiểm tra' }

  // Personal practice (no ClassTest) => monitoring off
  const classTest = await findClassTestByTestId(input.testId)
  if (!classTest || !classTest.monitoringEnabled) {
    return { success: true, data: { monitoring: false } }
  }

  const membership = await prisma.classMember.findFirst({
    where: { studentId: user.id, classId: classTest.classId },
    select: { id: true },
  })
  if (!membership) {
    return { success: false, error: 'Bạn không thuộc lớp được giao bài này' }
  }

  const existing = await prisma.submission.findFirst({
    where: {
      testId: input.testId,
      studentId: user.id,
      status: 'IN_PROGRESS',
    },
    orderBy: { attemptNumber: 'desc' },
    select: { id: true, attemptNumber: true, status: true },
  })
  if (existing) {
    return {
      success: true,
      data: {
        monitoring: true,
        submissionId: existing.id,
        attemptId: existing.id,
        attemptNumber: existing.attemptNumber,
        status: 'IN_PROGRESS',
      },
    }
  }

  const prevAttempts = await prisma.submission.count({
    where: {
      testId: input.testId,
      studentId: user.id,
      status: { not: 'IN_PROGRESS' },
    },
  })
  const attemptNumber = prevAttempts + 1
  const questionIds = test.questionIds as string[]

  const submission = await prisma.submission.create({
    data: {
      testId: input.testId,
      studentId: user.id,
      attemptNumber,
      score: 0,
      totalQuestions: questionIds.length,
      correctCount: 0,
      timeSpentSeconds: 0,
      status: 'IN_PROGRESS',
    },
    select: { id: true, attemptNumber: true, status: true },
  })

  return {
    success: true,
    data: {
      monitoring: true,
      submissionId: submission.id,
      attemptId: submission.id,
      attemptNumber: submission.attemptNumber,
      status: 'IN_PROGRESS',
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Record consent (one per submission)
// ---------------------------------------------------------------------------

export async function recordConsentAction(input: {
  submissionId?: string
  /** UI alias for submissionId */
  attemptId?: string
  outcome?: 'granted' | 'refused'
  /** UI alias for outcome */
  decision?: ConsentDecision
  noticeVersion?: string
  noticeHash?: string
}): Promise<ActionResult<{ consentId: string }>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới ghi nhận đồng ý giám sát' }
  }

  const submissionId = resolveSubmissionId(input)
  if (!submissionId) return { success: false, error: 'Thiếu phiên giám sát' }

  const outcome = input.outcome ?? input.decision
  if (!outcome || !CONSENT_OUTCOMES.has(outcome)) {
    return { success: false, error: 'outcome không hợp lệ' }
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, studentId: true },
  })
  if (!submission) return { success: false, error: 'Không tìm thấy bài làm' }
  if (submission.studentId !== user.id) {
    return { success: false, error: 'Không có quyền' }
  }

  const existing = await prisma.anticheatConsent.findUnique({
    where: { submissionId },
    select: { id: true, outcome: true },
  })
  if (existing) {
    // Idempotent: same outcome is OK so refresh/retry can continue into the quiz.
    if (existing.outcome === outcome) {
      return { success: true, data: { consentId: existing.id } }
    }
    return { success: false, error: 'Consent đã được ghi nhận (409)' }
  }

  try {
    const consent = await prisma.anticheatConsent.create({
      data: {
        submissionId,
        outcome,
        noticeVersion: input.noticeVersion ?? null,
        noticeHash: input.noticeHash ?? null,
      },
      select: { id: true },
    })

    if (outcome === 'refused') {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          unproctoredAt: new Date(),
          unproctoredReason: 'refused_monitoring',
          unproctoredBy: user.id,
        },
      })
    }

    return { success: true, data: { consentId: consent.id } }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { success: false, error: 'Consent đã được ghi nhận (409)' }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// 3. Record flag (+ optional evidence); cap ~20 per submission
// ---------------------------------------------------------------------------

export async function recordFlagAction(input: {
  submissionId?: string
  /** UI alias for submissionId */
  attemptId?: string
  trigger: AnticheatTrigger | 'hint'
  clientAt?: string | Date
  /** Optional UI detail stored in hashWindow.meta when no hash samples yet */
  detail?: string
  hashWindow?: Prisma.InputJsonValue
  evidenceMeta?: { framePath?: string }
}): Promise<
  ActionResult<{
    flagId: string
    evidenceId?: string
    capped?: boolean
  }>
> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới ghi nhận cờ giám sát' }
  }

  const submissionId = resolveSubmissionId(input)
  if (!submissionId) return { success: false, error: 'Thiếu phiên giám sát' }

  const trigger = input.trigger as AnticheatTrigger
  if (!FLAG_TRIGGERS.has(trigger)) {
    return { success: false, error: 'trigger không hợp lệ' }
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, studentId: true },
  })
  if (!submission) return { success: false, error: 'Không tìm thấy bài làm' }
  if (submission.studentId !== user.id) {
    return { success: false, error: 'Không có quyền' }
  }

  const consent = await prisma.anticheatConsent.findUnique({
    where: { submissionId },
    select: { outcome: true },
  })
  if (!consent || consent.outcome !== 'granted') {
    return { success: false, error: 'Chưa đồng ý giám sát — không ghi nhận cờ' }
  }

  const flagCount = await prisma.anticheatFlag.count({
    where: { submissionId },
  })
  if (flagCount >= MAX_FLAGS_PER_SUBMISSION) {
    return { success: false, error: 'evidence_capped' }
  }

  const clientAtRaw = input.clientAt ?? new Date()
  const clientAt =
    typeof clientAtRaw === 'string' ? new Date(clientAtRaw) : clientAtRaw
  if (Number.isNaN(clientAt.getTime())) {
    return { success: false, error: 'clientAt không hợp lệ' }
  }

  const hashWindow =
    input.hashWindow !== undefined
      ? input.hashWindow
      : input.detail
        ? ({ detail: input.detail } as Prisma.InputJsonValue)
        : undefined

  const hasEvidence =
    hashWindow !== undefined || Boolean(input.evidenceMeta?.framePath)

  const flag = await prisma.anticheatFlag.create({
    data: {
      submissionId,
      trigger,
      clientAt,
      ...(hasEvidence
        ? {
            evidence: {
              create: {
                trigger,
                clientAt,
                hashWindow:
                  hashWindow === undefined ? Prisma.JsonNull : hashWindow,
                framePath: input.evidenceMeta?.framePath ?? null,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      evidence: { select: { id: true } },
    },
  })

  return {
    success: true,
    data: {
      flagId: flag.id,
      evidenceId: flag.evidence?.id,
      capped: flagCount + 1 >= MAX_FLAGS_PER_SUBMISSION,
    },
  }
}

// ---------------------------------------------------------------------------
// 4. List flags for a submission
// ---------------------------------------------------------------------------

export async function listFlagsForSubmissionAction(input: {
  submissionId: string
}): Promise<ActionResult<{ flags: AnticheatFlagItem[] }>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  const submission = await loadSubmissionAccess(input.submissionId)
  if (!submission) return { success: false, error: 'Không tìm thấy bài làm' }
  if (!isOwnerOrTeacherOrAdmin(user, submission)) {
    return { success: false, error: 'Không có quyền' }
  }

  const flags = await prisma.anticheatFlag.findMany({
    where: { submissionId: input.submissionId },
    orderBy: { clientAt: 'asc' },
    select: {
      id: true,
      trigger: true,
      clientAt: true,
      createdAt: true,
      reviewDecision: true,
      evidence: {
        select: {
          hashWindow: true,
        },
      },
    },
  })

  const items: AnticheatFlagItem[] = flags.map((f) => {
    const hw = f.evidence?.hashWindow
    let detail: string | null = null
    if (hw && typeof hw === 'object' && !Array.isArray(hw) && 'detail' in hw) {
      const d = (hw as { detail?: unknown }).detail
      detail = typeof d === 'string' ? d : null
    }
    return {
      id: f.id,
      trigger: f.trigger,
      detail,
      createdAt: f.createdAt.toISOString(),
      clientAt: f.clientAt.toISOString(),
      reviewStatus: f.reviewDecision,
    }
  })

  return { success: true, data: { flags: items } }
}

// ---------------------------------------------------------------------------
// 5. Review flag (teacher/admin) — never touches score
// ---------------------------------------------------------------------------

export async function reviewFlagAction(input: {
  flagId: string
  decision: 'confirmed' | 'dismissed'
  note?: string
}): Promise<ActionResult<{ flagId: string; reviewDecision: AnticheatReviewDecision }>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { success: false, error: 'Chỉ giáo viên/admin được duyệt cờ' }
  }
  if (!REVIEW_DECISIONS.has(input.decision)) {
    return { success: false, error: 'decision không hợp lệ' }
  }

  const flag = await prisma.anticheatFlag.findUnique({
    where: { id: input.flagId },
    select: {
      id: true,
      submission: {
        select: {
          test: { select: { class: { select: { teacherId: true } } } },
        },
      },
    },
  })
  if (!flag) return { success: false, error: 'Không tìm thấy cờ giám sát' }

  const classTeacherId = flag.submission.test.class.teacherId
  if (!isTeacherOrAdminOfClass(user, classTeacherId)) {
    return { success: false, error: 'Không có quyền' }
  }

  // Intentionally does not update Submission.score or any grade fields.
  const updated = await prisma.anticheatFlag.update({
    where: { id: input.flagId },
    data: {
      reviewDecision: input.decision,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNote: input.note ?? null,
    },
    select: { id: true, reviewDecision: true },
  })

  return {
    success: true,
    data: { flagId: updated.id, reviewDecision: updated.reviewDecision },
  }
}
