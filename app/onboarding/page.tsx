import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { StudentOnboarding } from '@/components/onboarding/student-onboarding'
import { TeacherOnboarding } from '@/components/onboarding/teacher-onboarding'

export default async function OnboardingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  if (user.role === 'teacher') {
    return <TeacherOnboarding fullName={user.fullName} />
  }

  return <StudentOnboarding fullName={user.fullName} />
}
