import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { fetchTestBankListData } from '@/lib/test-bank/queries'
import { AdminTestBankClient } from '@/components/admin/admin-test-bank-client'

export default async function AdminTestBankPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin' && user.role !== 'teacher') {
    redirect('/onboarding')
  }

  const { tests, groups } = await fetchTestBankListData()

  return <AdminTestBankClient initialTests={tests} initialGroups={groups} />
}
