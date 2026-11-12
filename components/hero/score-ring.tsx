'use client'

import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/components/hero/use-demo-sequence'
import { cn } from '@/lib/utils'

interface ScoreRingProps {
  /** Final percentage, 0-100. */
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}

const DURATION = 1100

export function ScoreRing({
  value,
  size = 132,
  strokeWidth = 10,
  className,
}: ScoreRingProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const progress = reducedMotion ? value : animatedProgress

  useEffect(() => {
    if (reducedMotion) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / DURATION, 1)
      // ease-out cubic
      const eased = 1 - (1 - elapsed) ** 3
      setAnimatedProgress(Math.round(value * eased))
      if (elapsed < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reducedMotion])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={`Điểm ${value} phần trăm`}
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
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Điểm
        </span>
      </div>
    </div>
  )
}
