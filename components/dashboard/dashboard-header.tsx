'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, LogOut, Star } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { signOutAction } from '@/lib/auth/actions'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

interface DashboardHeaderProps {
  studentName: string
  initials: string
  masteryScore: number
}

export function DashboardHeader({
  studentName,
  initials,
  masteryScore,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const isOverview = pathname === '/dashboard'
  const greeting = `${getGreeting()}, ${studentName}!`
  const greetingClass =
    'text-xl font-semibold tracking-tight text-foreground sm:text-2xl'

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/85 px-4 py-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div>
        {isOverview ? (
          <h1 className={greetingClass}>{greeting}</h1>
        ) : (
          <p className={greetingClass}>{greeting}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Hôm nay làm bài kiểm tra nào trước?
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          render={<Link href="/onboarding" />}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          Danh sách lớp
        </Button>
        <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
          <Star className="size-4 text-primary" aria-hidden="true" />
          Thành thạo: {masteryScore}/10
        </span>
        <Avatar size="lg">
          <AvatarFallback className="bg-secondary font-semibold text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <ThemeToggle />
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11">
            <LogOut className="size-4" aria-hidden="true" />
            Đăng xuất
          </Button>
        </form>
      </div>
    </header>
  )
}
