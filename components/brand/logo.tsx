import Image from 'next/image'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/content'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
  /** Show FPT as partnership mark (not the Mathz identity). */
  showPartner?: boolean
  /** Set to `null` to render without a link wrapper */
  href?: string | null
  size?: number
}

export function Logo({
  className,
  showWordmark = true,
  showPartner = true,
  href = '/',
  size = 28,
}: LogoProps) {
  const homeLabel = `${SITE_NAME} — trang chủ`

  const inner = (
    <>
      {showWordmark ? (
        <span
          className="font-display text-[1.35rem] leading-none tracking-tight text-foreground"
          aria-hidden={href !== null ? true : undefined}
        >
          {SITE_NAME}
        </span>
      ) : href === null ? (
        <span className="sr-only">{SITE_NAME}</span>
      ) : null}
      {showPartner ? (
        <>
          <span
            className="hidden h-4 w-px bg-border sm:block"
            aria-hidden="true"
          />
          <Image
            src="/fpt.png"
            alt=""
            width={size}
            height={size}
            className="h-auto w-auto max-h-7 rounded-sm object-contain opacity-75"
            style={{ width: size, height: 'auto' }}
            priority
          />
        </>
      ) : null}
    </>
  )

  if (href !== null) {
    return (
      <Link
        href={href ?? '/'}
        aria-label={homeLabel}
        className={cn('inline-flex shrink-0 items-center gap-2.5', className)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2.5', className)}>
      {inner}
    </span>
  )
}
