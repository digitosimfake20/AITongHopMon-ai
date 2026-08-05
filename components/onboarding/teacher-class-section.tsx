/**
 * Server component — renders a full class management card including:
 *  • Class info + edit/delete
 *  • RosterManager (Excel upload + manual)
 *  • PendingRequestsPanel
 */
import prisma from '@/lib/prisma'
import { RosterManager } from '@/components/teacher/roster-manager'
import { PendingRequestsPanel } from '@/components/teacher/pending-requests-panel'
import { TeacherClassManage } from '@/components/onboarding/teacher-class-manage'
import type { ClassSummary } from '@/lib/class/actions'
import { Bell, Users } from 'lucide-react'

interface TeacherClassSectionProps {
  classroom: ClassSummary
}

export async function TeacherClassSection({ classroom }: TeacherClassSectionProps) {
  const [roster, pendingRequests] = await Promise.all([
    prisma.classRosterEntry.findMany({
      where: { classId: classroom.id },
      include: { linkedUser: { select: { fullName: true } } },
      orderBy: { stt: 'asc' },
    }),
    prisma.profileChangeRequest.findMany({
      where: { classId: classroom.id, status: 'PENDING' },
      include: {
        user: { select: { fullName: true } },
        currentRoster: { select: { fullName: true } },
        targetRoster: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const rosterPublic = roster.map((e) => ({
    id: e.id,
    stt: e.stt,
    studentCode: e.studentCode,
    fullName: e.fullName,
    linkedUserId: e.linkedUserId,
    linkedUserName: e.linkedUser?.fullName ?? null,
  }))

  const requestsPublic = pendingRequests.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.fullName,
    currentName: r.currentRoster.fullName,
    targetName: r.targetRoster.fullName,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      {/* Class info + edit/delete */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{classroom.name}</h3>
          <p className="text-xs text-muted-foreground">
            Mã lớp:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {classroom.code}
            </code>{' '}
            · {classroom.memberCount} thành viên / {classroom.maxCapacity}
          </p>
        </div>
        <TeacherClassManage
          classId={classroom.id}
          name={classroom.name}
          code={classroom.code}
          maxCapacity={classroom.maxCapacity}
        />
      </div>

      {/* Pending requests badge */}
      {requestsPublic.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="size-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Yêu cầu chờ duyệt ({requestsPublic.length})
            </h4>
          </div>
          <PendingRequestsPanel requests={requestsPublic} />
        </div>
      )}

      {/* Roster Manager */}
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <Users className="size-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Danh sách lớp (Sổ điểm)
          </h4>
        </div>
        <RosterManager classId={classroom.id} initialRoster={rosterPublic} />
      </div>
    </div>
  )
}
