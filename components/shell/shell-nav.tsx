'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { hrefPath, navArrived, pickNavWaitLine } from '@/lib/shell/nav-wait'
import { cn } from '@/lib/utils'

const NAV_LOCK_MS = 12_000

type ShellNavContextValue = {
  pendingHref: string | null
  line: string | null
  start: (href: string) => boolean
}

const ShellNavContext = createContext<ShellNavContextValue | null>(null)

function useShellNav(): ShellNavContextValue | null {
  return useContext(ShellNavContext)
}

/**
 * One in-flight dashboard tab switch. Extra clicks are ignored until the
 * pathname catches up (or the lock times out).
 */
export function ShellNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const pendingRef = useRef<string | null>(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [line, setLine] = useState<string | null>(null)

  const clear = useCallback(() => {
    pendingRef.current = null
    setPendingHref(null)
    setLine(null)
  }, [])

  const start = useCallback(
    (href: string) => {
      if (pendingRef.current) return false
      pendingRef.current = href
      setPendingHref(href)
      setLine(pickNavWaitLine(Date.now()))
      router.push(href)
      return true
    },
    [router],
  )

  useEffect(() => {
    if (!pendingRef.current) return
    if (navArrived(pathname, pendingRef.current)) clear()
  }, [pathname, clear])

  useEffect(() => {
    if (!pendingHref) return
    const timer = window.setTimeout(clear, NAV_LOCK_MS)
    return () => window.clearTimeout(timer)
  }, [pendingHref, clear])

  const value = useMemo(
    () => ({ pendingHref, line, start }),
    [pendingHref, line, start],
  )

  return <ShellNavContext.Provider value={value}>{children}</ShellNavContext.Provider>
}

interface ShellNavLinkProps {
  href: string
  active: boolean
  className?: string
  children: ReactNode
  onNavigate?: () => void
}

/** Sidebar / mobile tab. Highlights the destination immediately and ignores extra clicks. */
export function ShellNavLink({
  href,
  active,
  className,
  children,
  onNavigate,
}: ShellNavLinkProps) {
  const nav = useShellNav()
  const pendingHref = nav?.pendingHref ?? null
  const locked = pendingHref !== null
  const pendingThis = locked && hrefPath(href) === hrefPath(pendingHref)
  const shownActive = pendingHref ? pendingThis : active

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!nav) return
    if (locked || active) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    onNavigate?.()
    nav.start(href)
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={shownActive ? 'page' : undefined}
      aria-disabled={locked && !pendingThis ? true : undefined}
      onClick={onClick}
      className={cn(
        className,
        shownActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        locked && !pendingThis && 'pointer-events-none opacity-50',
      )}
    >
      {children}
    </Link>
  )
}

interface ShellMainProps {
  children: ReactNode
  className?: string
}

/** Main column. While a tab is opening, the previous page stays off-screen. */
export function ShellMain({ children, className }: ShellMainProps) {
  const nav = useShellNav()
  const pending = Boolean(nav?.pendingHref && nav.line)

  return (
    <main
      id="main-content"
      aria-busy={pending || undefined}
      className={cn('relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8', className)}
    >
      {pending ? (
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[40vh] flex-col justify-center"
        >
          <p className="text-lg font-semibold text-foreground">{nav?.line}</p>
          <div className="mt-4 h-1 w-36 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      ) : (
        children
      )}
    </main>
  )
}
