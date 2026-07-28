import { Construction } from 'lucide-react'

interface TeacherPlaceholderPageProps {
  title: string
  description: string
}

export function TeacherPlaceholderPage({
  title,
  description,
}: TeacherPlaceholderPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <Construction className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
