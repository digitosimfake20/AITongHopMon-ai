import { Section } from '@/components/layout/section'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQS } from '@/lib/content'

export function FaqSection() {
  return (
    <Section
      id="faq"
      title="Câu hỏi thường gặp"
      description="Thiếu câu trả lời thì đăng ký giáo viên để được hỗ trợ khi thiết lập lớp."
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card px-5 py-2 sm:px-6">
        <Accordion multiple={false}>
          {FAQS.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="py-4 text-[15px] hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-4 pr-6 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  )
}
