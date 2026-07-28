'use client'

import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'

interface TeacherHeaderProps {
  className: string
  subject: string
  studentCount: number
  teacherInitials: string
}

export function TeacherHeader({
  className,
  subject,
  studentCount,
  teacherInitials,
}: TeacherHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/85 px-4 py-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {className} — {subject}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground sm:text-base">
          <Users className="size-4" aria-hidden="true" />
          {studentCount} học sinh
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-h-11 px-5"
          nativeButton={false}
          render={<Link href="/teacher/assignments" />}
        >
          <Plus className="size-4" aria-hidden="true" />
          Tạo &amp; Giao Bài Mới
        </Button>
        <ThemeToggle />
        <Avatar size="lg">
          <AvatarFallback className="bg-secondary font-semibold text-foreground">
            {teacherInitials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
