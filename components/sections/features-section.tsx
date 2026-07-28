import { Section } from '@/components/layout/section'
import { FEATURES } from '@/lib/content'
import type { Feature } from '@/lib/types'

export function FeaturesSection() {
  return (
    <Section
      id="features"
      eyebrow="Tính năng"
      title="Mọi thứ cho một bài kiểm tra 15 phút — Không thừa, không thiếu"
      description="Mathz bao gồm toàn bộ quy trình, từ soạn đề cho đến biết đâu là 3 học sinh cần nói chuyện riêng ngày mai."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.id}>
            <FeatureCard feature={feature} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

interface FeatureCardProps {
  feature: Feature
}

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon

  return (
    <div className="group h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.15)]">
      <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors duration-300 group-hover:border-accent/30 group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-card-foreground">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </div>
  )
}
