'use client'

import { UserCheck } from 'lucide-react'
import { NameChangeRequest } from '@/components/student/name-change-request'
import type { RosterEntryPublic } from '@/app/actions/roster'

interface StudentRosterStatusProps {
  classId: string
  currentEntry: RosterEntryPublic
  allEntries: RosterEntryPublic[]
}

export function StudentRosterStatus({
  classId,
  currentEntry,
  allEntries,
}: StudentRosterStatusProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-emerald-600" />
          <span className="text-sm text-emerald-800 dark:text-emerald-300">
            Danh sách lớp:{' '}
            <strong>
              {currentEntry.stt}. {currentEntry.fullName}
            </strong>
          </span>
        </div>
        <NameChangeRequest
          classId={classId}
          currentEntry={currentEntry}
          allEntries={allEntries}
        />
      </div>
    </div>
  )
}
