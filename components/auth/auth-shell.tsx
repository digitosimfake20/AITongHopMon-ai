import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { AuthRole } from '@/lib/auth/types'
import { StudentAnimation } from './student-animation'
import { TeacherAnimation } from './teacher-animation'

interface AuthShellProps {
  role: AuthRole
  title: string
  subtitle: string
  onBack: () => void
  children: React.ReactNode
}

export function AuthShell({ role, title, subtitle, onBack, children }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden items-center justify-center border-r border-border bg-muted/20 p-8 xl:p-12 lg:flex">
        <div className="w-full max-w-lg">
          {role === 'student' ? <StudentAnimation /> : <TeacherAnimation />}
        </div>
      </div>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Mathz
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
