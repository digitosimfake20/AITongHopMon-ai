import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'

interface LinkButtonProps
  extends Omit<ComponentProps<'a'>, 'color'>,
    VariantProps<typeof buttonVariants> {}

/**
 * Anchor styled as a button. Keeps Base UI happy about native button
 * semantics while still giving us real links for in-page navigation.
 */
export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
  ...anchorProps
}: LinkButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={<a href={href} {...anchorProps} />}
    >
      {children}
    </Button>
  )
}
