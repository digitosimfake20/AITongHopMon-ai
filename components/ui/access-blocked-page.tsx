import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccessBlockedPageProps {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function AccessBlockedPage({
  title = 'Không truy cập được',
  description = 'Liên kết có thể sai, bài đã hết hạn, hoặc tài khoản không có quyền xem nội dung này.',
  backHref = '/dashboard',
  backLabel = 'Quay lại',
}: AccessBlockedPageProps) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
        <ShieldAlert className="size-7 text-amber-700 dark:text-amber-400" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Button className="mt-6 min-h-11 gap-2" nativeButton={false} render={<Link href={backHref} />}>
        <ArrowLeft className="size-4" />
        {backLabel}
      </Button>
    </main>
  )
}
