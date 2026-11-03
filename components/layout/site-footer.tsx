import { Logo } from '@/components/brand/logo'
import { SITE_NAME } from '@/lib/content'

const FOOTER_GROUPS = [
  {
    id: 'product',
    title: 'Sản phẩm',
    links: [
      { label: 'Tính năng', href: '#features' },
      { label: 'Cách hoạt động', href: '#how-it-works' },
      { label: 'Bảng giá', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    id: 'schools',
    title: 'Nhà trường',
    links: [
      { label: 'Đăng ký giáo viên', href: '/signup/teacher' },
      { label: 'Đăng ký học sinh', href: '/signup/student' },
      { label: 'Đăng nhập', href: '/login' },
      { label: 'Bắt đầu miễn phí', href: '#cta' },
    ],
  },
  {
    id: 'company',
    title: 'Liên hệ',
    links: [
      { label: 'Về Mathz', href: '#top' },
      { label: 'Bảo mật dữ liệu', href: '#faq' },
      { label: 'Hỗ trợ', href: '#cta' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Quiz Toán có AI, chấm tức thì và báo cáo lớp rõ ràng cho giáo viên.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.id} aria-label={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={`${group.id}-${link.label}`}>
                    <a
                      href={link.href}
                      className="rounded text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}. Bảo lưu mọi quyền.
          </p>
          <p className="text-xs text-muted-foreground">
            Làm cho lớp học Toán FPT.
          </p>
        </div>
      </div>
    </footer>
  )
}
