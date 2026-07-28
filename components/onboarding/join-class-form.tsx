'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { joinClassAction } from '@/lib/class/actions'
import { normalizeClassCode } from '@/lib/class/code'

export function JoinClassForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const result = await joinClassAction(normalizeClassCode(code))
    if (result.success && result.data) {
      toast.success(`Đã tham gia lớp ${result.data.className}`)
      setCode('')
      router.push(`/dashboard?class=${result.data.classId}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Không thể tham gia lớp')
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-dashed border-border bg-card/40 p-6">
      <h3 className="font-semibold text-foreground">Tham gia lớp bằng mã</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Nhập mã 8 ký tự do thầy cô cung cấp (VD: MATH8A2X)
      </p>
      <input
        value={code}
        onChange={(e) => setCode(normalizeClassCode(e.target.value).slice(0, 8))}
        placeholder="MATH8A2X"
        maxLength={8}
        required
        className="mt-4 min-h-11 w-full rounded-lg border border-input bg-background px-4 font-mono text-lg tracking-widest uppercase"
      />
      <Button type="submit" disabled={isLoading || code.length !== 8} className="mt-4 min-h-11 w-full">
        {isLoading ? 'Đang tham gia...' : 'Tham gia lớp'}
      </Button>
    </form>
  )
}
