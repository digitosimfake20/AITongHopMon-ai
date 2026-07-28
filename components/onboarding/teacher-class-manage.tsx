'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  deleteClassAction,
  getClassRoster,
  removeStudentAction,
  updateClassAction,
} from '@/lib/class/actions'

interface TeacherClassManageProps {
  classId: string
  name: string
  code: string
  maxCapacity: number
}

export function TeacherClassManage({
  classId,
  name,
  code,
  maxCapacity,
}: TeacherClassManageProps) {
  const [expanded, setExpanded] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editCapacity, setEditCapacity] = useState(maxCapacity)
  const [roster, setRoster] = useState<
    Awaited<ReturnType<typeof getClassRoster>> | null
  >(null)

  async function loadRoster() {
    const data = await getClassRoster(classId)
    setRoster(data)
    setExpanded(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('classId', classId)
    fd.set('name', editName)
    fd.set('maxCapacity', String(editCapacity))
    const result = await updateClassAction(fd)
    if (result.success) toast.success('Đã cập nhật lớp')
    else toast.error(result.error)
  }

  async function handleDelete() {
    if (!confirm('Xóa lớp này? Hành động không thể hoàn tác.')) return
    const result = await deleteClassAction(classId)
    if (result.success) {
      toast.success('Đã xóa lớp')
      window.location.reload()
    } else toast.error(result.error)
  }

  async function handleRemoveStudent(studentId: string) {
    const result = await removeStudentAction(classId, studentId)
    if (result.success) {
      toast.success('Đã xóa học sinh khỏi lớp')
      loadRoster()
    } else toast.error(result.error)
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 text-sm">
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : loadRoster())}
        className="font-medium text-accent hover:underline"
      >
        {expanded ? 'Thu gọn quản lý' : 'Quản lý lớp'}
      </button>
      {expanded ? (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleUpdate} className="space-y-3">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-input px-3"
            />
            <input
              type="number"
              value={editCapacity}
              onChange={(e) => setEditCapacity(Number(e.target.value))}
              className="min-h-10 w-full rounded-lg border border-input px-3"
            />
            <Button type="submit" size="sm" className="min-h-9">
              Lưu thay đổi
            </Button>
          </form>
          <p className="font-mono text-muted-foreground">Mã: {code}</p>
          <ul className="space-y-2">
            {roster?.members.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>{s.fullName}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  onClick={() => handleRemoveStudent(s.id)}
                >
                  Xóa
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="destructive" onClick={handleDelete} className="min-h-9">
            Xóa lớp
          </Button>
        </div>
      ) : null}
    </div>
  )
}
