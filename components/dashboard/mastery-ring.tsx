'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface MasteryRingProps {
  value: number
  size?: number
  className?: string
}

export function MasteryRing({ value, size = 140, className }: MasteryRingProps) {
  const [progress, setProgress] = useState(0)
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / 1000, 1)
      const eased = 1 - (1 - elapsed) ** 3
      setProgress(Math.round(value * eased))
      if (elapsed < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={`Mức thành thạo ${value} phần trăm`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--success)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
          {progress}%
        </span>
      </div>
    </div>
  )
}
