'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface AccessibleDialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name when no visible title is provided. */
  'aria-label'?: string
  /** Visible title; wired to aria-labelledby. Prefer this over aria-label. */
  title?: ReactNode
  /** Optional id for the title element; auto-generated when omitted. */
  titleId?: string
  children: ReactNode
  /** Named close control label (Vietnamese default). */
  closeLabel?: string
  /** Close when backdrop is clicked. Default true. */
  closeOnBackdropClick?: boolean
  /** Close on Escape. Default true. */
  closeOnEscape?: boolean
  /** Show the labelled X close button. Default true. */
  showCloseButton?: boolean
  className?: string
  panelClassName?: string
  /** Optional footer / actions row below children. */
  footer?: ReactNode
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

export function AccessibleDialog({
  open,
  onClose,
  'aria-label': ariaLabel,
  title,
  titleId: titleIdProp,
  children,
  closeLabel = 'Đóng',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  panelClassName,
  footer,
}: AccessibleDialogProps) {
  const autoId = useId()
  const titleId = titleIdProp ?? `${autoId}-title`
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    if (panel) {
      const focusables = getFocusable(panel)
      const initial =
        focusables.find((el) => el.hasAttribute('data-dialog-initial-focus')) ??
        focusables.find((el) => el.getAttribute('aria-label') === closeLabel) ??
        focusables[0] ??
        panel
      initial.focus()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, closeLabel])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) return

    if (closeOnEscape && event.key === 'Escape') {
      event.stopPropagation()
      handleClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) return

    const focusables = getFocusable(panelRef.current)
    if (focusables.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === first || active === panelRef.current) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const onBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdropClick) return
    if (event.target === event.currentTarget) handleClose()
  }

  if (!open) return null

  const labelledBy = title ? titleId : undefined
  const label = title ? undefined : ariaLabel

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        className,
      )}
      onClick={onBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'border-border bg-background text-foreground relative w-full max-w-lg rounded-xl border p-5 shadow-lg outline-none',
          panelClassName,
        )}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            {title ? (
              <h2 id={titleId} className="text-lg font-semibold leading-snug">
                {title}
              </h2>
            ) : (
              <span className="sr-only" id={titleId}>
                {ariaLabel}
              </span>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                aria-label={closeLabel}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 -mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-transparent transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}

        <div>{children}</div>

        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
