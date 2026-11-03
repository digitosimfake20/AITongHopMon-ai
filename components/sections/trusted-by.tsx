import { TRUSTED_BY } from '@/lib/content'

export function TrustedBy() {
  if (TRUSTED_BY.length === 0) return null

  return (
    <section
      aria-label="Trường đang dùng Mathz"
      className="border-y border-border bg-secondary/35 py-8"
    >
      <p className="text-center text-xs font-medium tracking-wide text-muted-foreground">
        Đang dùng trong lớp tại
      </p>
      {TRUSTED_BY.length === 1 ? (
        <p className="mt-3 text-center text-sm font-medium text-muted-foreground">
          {TRUSTED_BY[0]}
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4">
          {TRUSTED_BY.map((name) => (
            <li
              key={name}
              className="whitespace-nowrap text-sm font-medium text-muted-foreground"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
