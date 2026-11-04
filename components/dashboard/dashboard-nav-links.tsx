'use client'

import { usePathname } from 'next/navigation'
import { ShellNavLink } from '@/components/shell/shell-nav'
import { DASHBOARD_NAV } from '@/lib/dashboard-nav'

/** Active-state nav only — keeps the sidebar chrome as an RSC. */
export function DashboardNavLinks() {
  const pathname = usePathname()

  return (
    <>
      {DASHBOARD_NAV.map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <ShellNavLink
            key={item.id}
            href={item.href}
            active={active}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </ShellNavLink>
        )
      })}
    </>
  )
}
