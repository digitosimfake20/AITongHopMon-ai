'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/auth/types'
import { parseRosterBuffer } from '@/lib/excel/parse-roster'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RosterEntryPublic {
  id: string
  stt: number
  studentCode: string
  fullName: string
  linkedUserId: string | null
  linkedUserName: string | null
}

export interface ParsePreviewResult {
  meta: { subject: string; className: string; term: string }
  students: Array<{ stt: number; studentCode: string; fullName: string }>
}

// ---------------------------------------------------------------------------
// Parse Excel file (no DB write — for preview only)
// ---------------------------------------------------------------------------

export async function parseExcelRosterAction(
  formData: FormData,
): Promise<ActionResult<ParsePreviewResult>> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') {
    return { success: false, error: 'Chỉ giáo viên mới có thể upload danh sách học sinh' }
  }

  const file = formData.get('file') as File | null
  if (!file) return { success: false, error: 'Chưa chọn file' }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    return { success: false, error: 'Chỉ nhận file .xlsx hoặc .xls' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File quá lớn (tối đa 5MB)' }
  }

  try {
    const buffer = await file.arrayBuffer()
    const parsed = parseRosterBuffer(buffer)
    return {
      success: true,
      data: {
        meta: parsed.meta,
        students: parsed.students,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể đọc file'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Save roster (replaces existing roster for the class)
// ---------------------------------------------------------------------------

export async function saveRosterAction(input: {
  classId: string
  students: Array<{ stt: number; studentCode: string; fullName: string }>
}): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') {
    return { success: false, error: 'Không có quyền' }
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: input.classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không tìm thấy lớp hoặc không có quyền' }

  if (input.students.length === 0) {
    return { success: false, error: 'Danh sách học sinh không được để trống' }
  }

  // Validate uniqueness within the submitted list
  const stts = input.students.map((s) => s.stt)
  if (new Set(stts).size !== stts.length) {
    return { success: false, error: 'STT bị trùng lặp trong danh sách' }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.classRosterEntry.findMany({
      where: { classId: input.classId },
      select: { stt: true, linkedUserId: true },
    })
    const linkMap = new Map(existing.map((e) => [e.stt, e.linkedUserId]))

    await tx.classRosterEntry.deleteMany({ where: { classId: input.classId } })

    await tx.classRosterEntry.createMany({
      data: input.students.map((s) => ({
        classId: input.classId,
        stt: s.stt,
        studentCode: s.studentCode || String(s.stt),
        fullName: s.fullName.trim(),
        linkedUserId: linkMap.get(s.stt) ?? null,
      })),
    })
  })

  revalidatePath('/onboarding')
  revalidatePath(`/teacher/students`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Add single roster entry manually
// ---------------------------------------------------------------------------

export async function addRosterEntryAction(input: {
  classId: string
  stt: number
  studentCode: string
  fullName: string
}): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') return { success: false, error: 'Không có quyền' }

  const classroom = await prisma.classroom.findFirst({
    where: { id: input.classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không tìm thấy lớp' }

  if (!input.fullName.trim()) return { success: false, error: 'Họ tên không được để trống' }

  const exists = await prisma.classRosterEntry.findFirst({
    where: { classId: input.classId, stt: input.stt },
  })
  if (exists) return { success: false, error: `STT ${input.stt} đã tồn tại trong danh sách` }

  await prisma.classRosterEntry.create({
    data: {
      classId: input.classId,
      stt: input.stt,
      studentCode: input.studentCode || String(input.stt),
      fullName: input.fullName.trim(),
    },
  })

  revalidatePath('/onboarding')
  revalidatePath('/teacher/students')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update a single roster entry
// ---------------------------------------------------------------------------

export async function updateRosterEntryAction(input: {
  entryId: string
  fullName: string
  studentCode: string
}): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') return { success: false, error: 'Không có quyền' }
  if (!isUuid(input.entryId)) return { success: false, error: 'ID học sinh không hợp lệ' }

  const entry = await prisma.classRosterEntry.findUnique({ where: { id: input.entryId } })
  if (!entry) return { success: false, error: 'Không tìm thấy học sinh' }

  const classroom = await prisma.classroom.findFirst({
    where: { id: entry.classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không có quyền chỉnh sửa lớp này' }

  await prisma.classRosterEntry.update({
    where: { id: input.entryId },
    data: { fullName: input.fullName.trim(), studentCode: input.studentCode.trim() },
  })

  revalidatePath('/onboarding')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Delete a single roster entry
// ---------------------------------------------------------------------------

export async function deleteRosterEntryAction(entryId: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') return { success: false, error: 'Không có quyền' }
  if (!isUuid(entryId)) return { success: false, error: 'ID học sinh không hợp lệ' }

  const entry = await prisma.classRosterEntry.findUnique({ where: { id: entryId } })
  if (!entry) return { success: false, error: 'Không tìm thấy' }

  const classroom = await prisma.classroom.findFirst({
    where: { id: entry.classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không có quyền' }

  await prisma.classRosterEntry.delete({ where: { id: entryId } })
  revalidatePath('/onboarding')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Get roster for a class
// ---------------------------------------------------------------------------

export async function getClassRosterAction(classId: string): Promise<ActionResult<RosterEntryPublic[]>> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  // Scope: only teacher of class or enrolled student may view roster
  const hasAccess = await prisma.classroom.findFirst({
    where: {
      id: classId,
      OR: [
        { teacherId: user.id },
        { members: { some: { studentId: user.id } } },
      ],
    },
    select: { id: true },
  })
  if (!hasAccess) return { success: false, error: 'Không có quyền xem danh sách lớp này' }

  const entries = await prisma.classRosterEntry.findMany({
    where: { classId },
    include: { linkedUser: { select: { fullName: true } } },
    orderBy: { stt: 'asc' },
  })

  return {
    success: true,
    data: entries.map((e) => ({
      id: e.id,
      stt: e.stt,
      studentCode: e.studentCode,
      fullName: e.fullName,
      linkedUserId: e.linkedUserId,
      linkedUserName: e.linkedUser?.fullName ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// Student: look up roster by class code (returns sanitized list)
// ---------------------------------------------------------------------------

export async function getRosterByCodeAction(
  code: string,
): Promise<ActionResult<{ classId: string; className: string; entries: RosterEntryPublic[] }>> {
  const classroom = await prisma.classroom.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      roster: {
        include: { linkedUser: { select: { fullName: true } } },
        orderBy: { stt: 'asc' },
      },
    },
  })

  if (!classroom) return { success: false, error: 'Không tìm thấy lớp với mã này' }

  const entries: RosterEntryPublic[] = classroom.roster.map((e) => ({
    id: e.id,
    stt: e.stt,
    studentCode: e.studentCode,
    fullName: e.fullName,
    linkedUserId: e.linkedUserId,
    linkedUserName: e.linkedUser?.fullName ?? null,
  }))

  return {
    success: true,
    data: { classId: classroom.id, className: classroom.name, entries },
  }
}

// ---------------------------------------------------------------------------
// Student: claim a roster name (link account to roster entry)
// ---------------------------------------------------------------------------

export async function claimRosterNameAction(input: {
  rosterId: string
  classId: string
}): Promise<ActionResult<{ classId: string; className: string }>> {
  const user = await getSessionUser()
  if (!user || user.role !== 'student') {
    return { success: false, error: 'Chỉ học sinh mới có thể chọn tên' }
  }

  // Check entry exists and belongs to the class
  const entry = await prisma.classRosterEntry.findFirst({
    where: { id: input.rosterId, classId: input.classId },
    include: { class: true },
  })
  if (!entry) return { success: false, error: 'Không tìm thấy tên trong danh sách lớp' }

  // Check not already taken by another user
  if (entry.linkedUserId && entry.linkedUserId !== user.id) {
    return { success: false, error: 'Tên này đã được bạn khác chọn. Hãy chọn tên của bạn.' }
  }

  // Check student doesn't already have a link in this class
  const existingLink = await prisma.classRosterEntry.findFirst({
    where: { classId: input.classId, linkedUserId: user.id },
  })
  if (existingLink && existingLink.id !== input.rosterId) {
    return {
      success: false,
      error: 'Bạn đã liên kết với một tên khác trong lớp này. Dùng tính năng "Đổi tên" nếu bấm nhầm.',
    }
  }

  await prisma.$transaction(async (tx) => {
    // Link roster entry to user — scoped to this class only
    const linked = await tx.classRosterEntry.updateMany({
      where: { id: input.rosterId, classId: input.classId },
      data: { linkedUserId: user.id },
    })
    if (linked.count === 0) {
      throw new Error('Không tìm thấy tên trong danh sách lớp')
    }
    // Also add to ClassMember if not already there
    await tx.classMember.upsert({
      where: { classId_studentId: { classId: input.classId, studentId: user.id } },
      create: { classId: input.classId, studentId: user.id },
      update: {},
    })
  })

  revalidatePath('/onboarding')
  revalidatePath('/dashboard')
  return { success: true, data: { classId: input.classId, className: entry.class.name } }
}

// ---------------------------------------------------------------------------
// Student: request a name change
// ---------------------------------------------------------------------------

export async function requestNameChangeAction(input: {
  classId: string
  targetRosterId: string
  reason: string
}): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'student') return { success: false, error: 'Không có quyền' }

  // Find current roster link
  const current = await prisma.classRosterEntry.findFirst({
    where: { classId: input.classId, linkedUserId: user.id },
  })
  if (!current) {
    return { success: false, error: 'Bạn chưa liên kết tên trong lớp này' }
  }

  if (current.id === input.targetRosterId) {
    return { success: false, error: 'Tên mục tiêu trùng với tên hiện tại' }
  }

  const target = await prisma.classRosterEntry.findFirst({
    where: { id: input.targetRosterId, classId: input.classId },
  })
  if (!target) return { success: false, error: 'Không tìm thấy tên mục tiêu' }

  if (target.linkedUserId && target.linkedUserId !== user.id) {
    return { success: false, error: 'Tên này đã được bạn khác liên kết' }
  }

  // Check for existing pending request
  const existing = await prisma.profileChangeRequest.findFirst({
    where: { classId: input.classId, userId: user.id, status: 'PENDING' },
  })
  if (existing) {
    return { success: false, error: 'Bạn đã có một yêu cầu đang chờ duyệt. Hãy đợi giáo viên xử lý.' }
  }

  await prisma.profileChangeRequest.create({
    data: {
      classId: input.classId,
      userId: user.id,
      currentRosterId: current.id,
      targetRosterId: input.targetRosterId,
      reason: input.reason.trim(),
    },
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Teacher: get pending change requests for their class
// ---------------------------------------------------------------------------

export interface ChangeRequestDetail {
  id: string
  userId: string
  userName: string
  currentName: string
  targetName: string
  reason: string
  createdAt: string
}

export async function getPendingRequestsAction(
  classId: string,
): Promise<ActionResult<ChangeRequestDetail[]>> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') return { success: false, error: 'Không có quyền' }

  const classroom = await prisma.classroom.findFirst({
    where: { id: classId, teacherId: user.id },
  })
  if (!classroom) return { success: false, error: 'Không có quyền quản lý lớp này' }

  const requests = await prisma.profileChangeRequest.findMany({
    where: { classId, status: 'PENDING' },
    include: {
      user: { select: { fullName: true } },
      currentRoster: { select: { fullName: true } },
      targetRoster: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return {
    success: true,
    data: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.fullName,
      currentName: r.currentRoster.fullName,
      targetName: r.targetRoster.fullName,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Teacher: approve / reject a change request
// ---------------------------------------------------------------------------

export async function resolveChangeRequestAction(input: {
  requestId: string
  approve: boolean
}): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || user.role !== 'teacher') return { success: false, error: 'Không có quyền' }

  const req = await prisma.profileChangeRequest.findUnique({
    where: { id: input.requestId },
    include: {
      class: true,
      currentRoster: { select: { classId: true, fullName: true, linkedUserId: true } },
      targetRoster: { select: { classId: true, fullName: true, linkedUserId: true } },
    },
  })
  if (!req) return { success: false, error: 'Không tìm thấy yêu cầu' }
  if (req.class.teacherId !== user.id) return { success: false, error: 'Không có quyền' }
  if (req.status !== 'PENDING') return { success: false, error: 'Yêu cầu đã được xử lý' }

  // Ensure rosters belong to the same class as the request
  if (
    req.currentRoster.classId !== req.classId ||
    req.targetRoster.classId !== req.classId
  ) {
    return { success: false, error: 'Yêu cầu không hợp lệ — roster không thuộc lớp này' }
  }

  const newStatus = input.approve ? ('APPROVED' as const) : ('REJECTED' as const)

  if (input.approve) {
    // Check target not already taken by another user
    if (req.targetRoster.linkedUserId && req.targetRoster.linkedUserId !== req.userId) {
      return { success: false, error: 'Tên mục tiêu đã được người khác liên kết. Hãy từ chối.' }
    }

    await prisma.$transaction(async (tx) => {
      // Unlink from current — scoped to this class only
      await tx.classRosterEntry.updateMany({
        where: { id: req.currentRosterId, classId: req.classId },
        data: { linkedUserId: null },
      })
      // Link to target — scoped to this class only
      await tx.classRosterEntry.updateMany({
        where: { id: req.targetRosterId, classId: req.classId },
        data: { linkedUserId: req.userId },
      })
      // Mark request resolved
      await tx.profileChangeRequest.update({
        where: { id: input.requestId },
        data: { status: newStatus, resolvedAt: new Date() },
      })
    })
  } else {
    await prisma.profileChangeRequest.update({
      where: { id: input.requestId },
      data: { status: newStatus, resolvedAt: new Date() },
    })
  }

  revalidatePath('/onboarding')
  revalidatePath('/teacher/students')
  return { success: true }
}
