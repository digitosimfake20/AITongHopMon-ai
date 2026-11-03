import { Section } from '@/components/layout/section'
import { TESTIMONIALS } from '@/lib/content'
import type { Testimonial } from '@/lib/types'

export function TestimonialsSection() {
  return (
    <Section
      title="Giáo viên sau một kỳ"
      description="Ít giờ chấm. Rõ chỗ lớp còn hổng."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <li key={testimonial.id}>
            <TestimonialCard testimonial={testimonial} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

interface TestimonialCardProps {
  testimonial: Testimonial
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-foreground/25">
      <blockquote className="text-[14px] leading-relaxed text-card-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs font-medium text-muted-foreground"
        >
          {testimonial.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {testimonial.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {testimonial.role} · {testimonial.school}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}
