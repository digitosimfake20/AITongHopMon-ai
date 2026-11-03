import { Section } from '@/components/layout/section'
import { TESTIMONIALS } from '@/lib/content'
import type { Testimonial } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TestimonialsSection() {
  const [featured, ...rest] = TESTIMONIALS

  return (
    <Section
      id="testimonials"
      title="Giáo viên FPT sau một học kỳ với Mathz"
      description="Họ cắt giờ chấm và chỉ ra chỗ lớp còn hổng trước kiểm tra."
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {featured ? (
          <FeaturedQuote testimonial={featured} />
        ) : null}
        <ul className="flex flex-col gap-4">
          {rest.map((testimonial, index) => (
            <li key={testimonial.id}>
              <SideQuote
                testimonial={testimonial}
                accent={index === 0}
              />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function FeaturedQuote({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col justify-between border-l-2 border-zeno pl-6 sm:pl-8">
      <blockquote className="text-xl font-medium leading-relaxed tracking-tight text-foreground sm:text-2xl">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-8">
        <span className="block text-sm font-semibold text-foreground">
          {testimonial.name}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {testimonial.role} · {testimonial.school}
        </span>
      </figcaption>
    </figure>
  )
}

function SideQuote({
  testimonial,
  accent,
}: {
  testimonial: Testimonial
  accent?: boolean
}) {
  return (
    <figure
      className={cn(
        'border-t border-border pt-4',
        accent && 'border-t-zeno/40',
      )}
    >
      <blockquote className="text-[14px] leading-relaxed text-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{testimonial.name}</span>
        {' · '}
        {testimonial.role}
      </figcaption>
    </figure>
  )
}
