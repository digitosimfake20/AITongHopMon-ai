import Link from 'next/link'
import { GraduationCap, School } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mathz
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">Đăng nhập</h1>
          <p className="mt-2 text-sm text-muted-foreground">Chọn vai trò của bạn</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/login/student"
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-border bg-card p-6 transition-colors hover:border-accent hover:bg-accent/5"
            >
              <GraduationCap className="size-10 text-accent" />
              <h2 className="mt-3 font-semibold">Học sinh</h2>
            </Link>
            <Link
              href="/login/teacher"
              className="flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-border bg-card p-6 transition-colors hover:border-accent hover:bg-accent/5"
            >
              <School className="size-10 text-accent" />
              <h2 className="mt-3 font-semibold">Giáo viên</h2>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
