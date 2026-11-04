'use client'

import { Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { LinkButton } from '@/components/ui/link-button'
import { NAV_LINKS } from '@/lib/content'

/** Mobile drawer only — keeps the marketing header itself as an RSC. */
export function SiteMobileNav() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    firstLinkRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 md:hidden"
      >
        {open ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <Menu className="size-4" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-16 z-50 animate-slide-up-fade border-b border-t border-border bg-background px-4 pb-5 pt-3 md:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link, index) => (
                <li key={link.href}>
                  <a
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <LinkButton
              href="/signup"
              onClick={() => setOpen(false)}
              className="h-10 w-full"
            >
              Đăng ký
            </LinkButton>
            <LinkButton
              href="/login"
              onClick={() => setOpen(false)}
              variant="outline"
              className="h-10 w-full"
            >
              Đăng nhập
            </LinkButton>
          </div>
        </div>
      ) : null}
    </>
  )
}
