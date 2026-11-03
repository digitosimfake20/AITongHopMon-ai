import Link from 'next/link'
import { GraduationCap, School } from 'lucide-react'

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mathz
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">Đăng ký</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chọn học sinh hoặc giáo viên để tạo đúng loại tài khoản.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/signup/student"
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GraduationCap className="size-10 text-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">Học sinh</h2>
              <p className="mt-1 text-xs text-muted-foreground">Tham gia lớp bằng mã</p>
            </Link>
            <Link
              href="/signup/teacher"
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <School className="size-10 text-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">Giáo viên</h2>
              <p className="mt-1 text-xs text-muted-foreground">Tạo lớp và giao bài</p>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
