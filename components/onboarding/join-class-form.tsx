'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { joinClassAction } from '@/lib/class/actions'
import { normalizeClassCode } from '@/lib/class/code'
import { getRosterByCodeAction } from '@/app/actions/roster'
import { NamePicker } from '@/components/student/name-picker'
import type { RosterEntryPublic } from '@/app/actions/roster'
import { Loader2 } from 'lucide-react'

interface JoinClassFormProps {
  currentUserId: string
}

type Step =
  | { type: 'code' }
  | { type: 'name-picker'; classId: string; className: string; entries: RosterEntryPublic[] }

export function JoinClassForm({ currentUserId }: JoinClassFormProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>({ type: 'code' })
  const [isPending, startTransition] = useTransition()

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeClassCode(code)
    if (normalized.length !== 8) { toast.error('Mã lớp phải đúng 8 ký tự'); return }

    startTransition(async () => {
      // Check if class has a roster
      const rosterRes = await getRosterByCodeAction(normalized)

      if (!rosterRes.success) {
        // Class not found or error
        toast.error(rosterRes.error ?? 'Không tìm thấy lớp')
        return
      }

      const { classId, className, entries } = rosterRes.data!

      if (entries.length > 0) {
        // Has a roster — show name picker
        setStep({ type: 'name-picker', classId, className, entries })
      } else {
        // No roster — fall back to direct join
        const result = await joinClassAction(normalized)
        if (result.success && result.data) {
          toast.success(`Đã tham gia lớp ${result.data.className}`)
          setCode('')
          router.push(`/dashboard?class=${result.data.classId}`)
          router.refresh()
        } else {
          toast.error(result.error ?? 'Không thể tham gia lớp')
        }
      }
    })
  }

  // ── Name picker step ──────────────────────────────────────────────────────

  if (step.type === 'name-picker') {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <button
          onClick={() => setStep({ type: 'code' })}
          className="mb-4 text-xs text-muted-foreground hover:underline"
        >
          ← Nhập mã khác
        </button>
        <NamePicker
          classId={step.classId}
          className={step.className}
          entries={step.entries}
          currentUserId={currentUserId}
        />
      </div>
    )
  }

  // ── Code entry step ───────────────────────────────────────────────────────

  return (
    <form onSubmit={handleCodeSubmit} className="rounded-xl border border-dashed border-border bg-card/40 p-6">
      <h3 className="font-semibold text-foreground">Tham gia lớp bằng mã</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Nhập mã 8 ký tự do thầy cô cung cấp
      </p>
      <input
        value={code}
        onChange={(e) => setCode(normalizeClassCode(e.target.value).slice(0, 8))}
        placeholder="MATHABCX"
        maxLength={8}
        required
        className="mt-4 min-h-11 w-full rounded-lg border border-input bg-background px-4 font-mono text-lg tracking-widest uppercase"
      />
      <Button
        type="submit"
        disabled={isPending || code.length !== 8}
        className="mt-4 min-h-11 w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Đang kiểm tra...
          </>
        ) : (
          'Tiếp tục'
        )}
      </Button>
    </form>
  )
}
