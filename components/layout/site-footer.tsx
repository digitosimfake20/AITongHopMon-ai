import { Logo } from '@/components/brand/logo'
import { SITE_NAME } from '@/lib/content'

const FOOTER_GROUPS = [
  {
    id: 'product',
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#top' },
    ],
  },
  {
    id: 'schools',
    title: 'Schools',
    links: [
      { label: 'For teachers', href: '#insights' },
      { label: 'For leadership', href: '#insights' },
      { label: 'Onboarding', href: '#faq' },
      { label: 'Book a walkthrough', href: '#cta' },
    ],
  },
  {
    id: 'company',
    title: 'Company',
    links: [
      { label: 'About', href: '#top' },
      { label: 'Privacy', href: '#faq' },
      { label: 'Security', href: '#faq' },
      { label: 'Contact', href: '#cta' },
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
              AI-assisted quizzes, instant grading and honest class insight for
              teachers who would rather be teaching.
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
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for classrooms, not conference rooms.
          </p>
        </div>
      </div>
    </footer>
  )
}
