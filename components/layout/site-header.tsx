import { Logo } from '@/components/brand/logo'
import { SiteMobileNav } from '@/components/layout/site-mobile-nav'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LinkButton } from '@/components/ui/link-button'
import { NAV_LINKS } from '@/lib/content'

/**
 * Marketing header is an RSC. Only the mobile menu is a client island.
 * Sticky chrome stays opaque (no scroll listener) to keep JS off the critical path.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LinkButton
            href="/login"
            variant="ghost"
            className="hidden h-9 px-3 sm:inline-flex"
          >
            Đăng nhập
          </LinkButton>
          <LinkButton
            href="/signup"
            className="hidden h-9 px-3.5 sm:inline-flex"
          >
            Đăng ký
          </LinkButton>
          <SiteMobileNav />
        </div>
      </div>
    </header>
  )
}
