import { TRUSTED_BY } from '@/lib/content'

export function TrustedBy() {
  const items = [...TRUSTED_BY, ...TRUSTED_BY]

  return (
    <section
      aria-label="Schools using Mathz"
      className="border-y border-border bg-card/40 py-8"
    >
      <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Used in classrooms at
      </p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <ul className="animate-marquee flex w-max items-center gap-12 pr-12">
          {items.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="whitespace-nowrap text-sm font-medium text-muted-foreground/80"
              aria-hidden={index >= TRUSTED_BY.length}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
