'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getActiveQuizSession,
  getRemainingSeconds,
} from '@/lib/quiz/active-quiz-session'

export function ActiveQuizBanner() {
  const [session, setSession] = useState<ReturnType<typeof getActiveQuizSession>>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    function refresh() {
      const current = getActiveQuizSession()
      setSession(current)
      if (current) setRemaining(getRemainingSeconds(current))
    }
    refresh()
    const id = setInterval(refresh, 1000)
    return () => clearInterval(id)
  }, [])

  if (!session || remaining <= 0) return null

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="sticky top-0 z-30 border-b border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
           Bạn có 1 bài kiểm tra chưa hoàn thành ({session.testTitle}) — còn {mm}:{ss}
        </p>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          nativeButton={false}
          render={<Link href={`/quiz/take/${session.testId}?resume=1`} />}
        >
          Tiếp tục làm ngay
        </Button>
      </div>
    </div>
  )
}
