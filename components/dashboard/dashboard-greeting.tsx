'use client'

import { usePathname } from 'next/navigation'

interface DashboardGreetingProps {
  /** Precomputed on the server (VN timezone) — do not recompute hours on the client. */
  greeting: string
}

/** Tiny island: pathname picks h1 vs p; greeting text is a stable server string. */
export function DashboardGreeting({ greeting }: DashboardGreetingProps) {
  const pathname = usePathname()
  const isOverview = pathname === '/dashboard'
  const greetingClass =
    'text-xl font-semibold tracking-tight text-foreground sm:text-2xl'

  if (isOverview) {
    return <h1 className={greetingClass}>{greeting}</h1>
  }

  return <p className={greetingClass}>{greeting}</p>
}
