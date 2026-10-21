import { redirect } from 'next/navigation'
import { withClassParam } from '@/lib/class/with-class-param'

interface PageProps {
  params: Promise<{ classId: string }>
}

/** Legacy URL — keep bookmarks working; canonical route is /teacher/gaps */
export default async function ClassGapsRedirectPage({ params }: PageProps) {
  const { classId } = await params
  redirect(withClassParam('/teacher/gaps', classId))
}
