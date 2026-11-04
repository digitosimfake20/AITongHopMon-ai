'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getActiveQuizSession,
  getRemainingSeconds,
} from '@/lib/quiz/active-quiz-session'

function formatClock(remaining: number) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function ActiveQuizBanner() {
  const [session, setSession] = useState<ReturnType<typeof getActiveQuizSession>>(null)
  const [remaining, setRemaining] = useState(0)
  const [announce, setAnnounce] = useState('')
  const announcedRef = useRef<Set<string>>(new Set())

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

  useEffect(() => {
    if (!session || remaining <= 0) return
    const key = session.testId
    const clock = formatClock(remaining)

    if (!announcedRef.current.has(`mount-${key}`)) {
      announcedRef.current.add(`mount-${key}`)
      setAnnounce(`Bài chưa xong: ${session.testTitle}. Còn ${clock}.`)
      return
    }
    if (remaining <= 60 && !announcedRef.current.has(`1m-${key}`)) {
      announcedRef.current.add(`1m-${key}`)
      setAnnounce(`Còn dưới 1 phút cho bài ${session.testTitle}.`)
      return
    }
    if (remaining <= 300 && !announcedRef.current.has(`5m-${key}`)) {
      announcedRef.current.add(`5m-${key}`)
      setAnnounce(`Còn dưới 5 phút cho bài ${session.testTitle}.`)
    }
  }, [session, remaining])

  if (!session || remaining <= 0) return null

  const clock = formatClock(remaining)

  return (
    <div className="sticky top-0 z-30 border-b border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          Bài chưa xong: {session.testTitle} · còn{' '}
          <span aria-hidden className="tabular-nums">
            {clock}
          </span>
        </p>
        <Button
          className="min-h-11 gap-1.5"
          nativeButton={false}
          render={<Link href={`/quiz/take/${session.testId}?resume=1`} prefetch={false} />}
        >
          Tiếp tục làm
        </Button>
      </div>
    </div>
  )
}
