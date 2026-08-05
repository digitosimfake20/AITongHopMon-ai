'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClassAction } from '@/lib/class/actions'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function CreateClassForm() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await createClassAction(formData)
    if (result.success && result.data) {
      toast.success(`Đã tạo lớp. Mã lớp: ${result.data.code}`)
      setOpen(false)
      window.location.href = `/teacher?class=${result.data.classId}`
    } else {
      toast.error(result.error ?? 'Không thể tạo lớp')
    }
    setIsLoading(false)
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="min-h-11 w-full sm:w-auto">
        + Tạo lớp mới
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 space-y-4"
    >
      <h3 className="font-semibold">Tạo lớp học mới</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="class-name" className="mb-1.5 block text-sm font-medium">
            Tên lớp *
          </label>
          <input
            id="class-name"
            name="name"
            required
            placeholder="Lớp Toán 8A2"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
            Môn học
          </label>
          <input
            id="subject"
            name="subject"
            placeholder="Toán"
            defaultValue="Toán"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
          />
        </div>
        <div>
          <label htmlFor="term" className="mb-1.5 block text-sm font-medium">
            Học kỳ / Niên khóa
          </label>
          <input
            id="term"
            name="term"
            placeholder="HK1 2024-2025"
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
          />
        </div>
        <div>
          <label htmlFor="maxCapacity" className="mb-1.5 block text-sm font-medium">
            Sĩ số dự kiến
          </label>
          <input
            id="maxCapacity"
            name="maxCapacity"
            type="number"
            min={1}
            max={200}
            defaultValue={35}
            required
            className="min-h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hệ thống tự sinh mã lớp 8 ký tự sau khi tạo. Bạn có thể thêm danh sách học sinh từ Excel sau khi tạo lớp.
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-11 flex-1">
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading} className="min-h-11 flex-1">
          {isLoading ? 'Đang tạo...' : 'Tạo lớp'}
        </Button>
      </div>
    </form>
  )
}
