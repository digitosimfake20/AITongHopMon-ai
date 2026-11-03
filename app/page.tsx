import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { CtaSection } from '@/components/sections/cta-section'
import { FaqSection } from '@/components/sections/faq-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { HeroSection } from '@/components/sections/hero-section'
import { InsightsSection } from '@/components/sections/insights-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { StudentSignupSection } from '@/components/sections/student-signup-section'
import { TestimonialsSection } from '@/components/sections/testimonials-section'
import { TrustedBy } from '@/components/sections/trusted-by'
import { WorkflowSection } from '@/components/sections/workflow-section'

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <TrustedBy />
        <FeaturesSection />
        <WorkflowSection />
        <InsightsSection />
        <TestimonialsSection />
        <StudentSignupSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
