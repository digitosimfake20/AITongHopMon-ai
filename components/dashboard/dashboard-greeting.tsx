'use client'

import { usePathname } from 'next/navigation'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

interface DashboardGreetingProps {
  studentName: string
}

/** Tiny island: pathname picks h1 vs p; time-of-day greeting stays client. */
export function DashboardGreeting({ studentName }: DashboardGreetingProps) {
  const pathname = usePathname()
  const isOverview = pathname === '/dashboard'
  const greeting = `${getGreeting()}, ${studentName}!`
  const greetingClass =
    'text-xl font-semibold tracking-tight text-foreground sm:text-2xl'

  if (isOverview) {
    return <h1 className={greetingClass}>{greeting}</h1>
  }

  return <p className={greetingClass}>{greeting}</p>
}
