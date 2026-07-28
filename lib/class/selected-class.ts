import { cookies } from 'next/headers'

export const SELECTED_CLASS_COOKIE = 'mathz_class_id'

export async function getSelectedClassId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SELECTED_CLASS_COOKIE)?.value ?? null
}

export async function setSelectedClassId(classId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_CLASS_COOKIE, classId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
  })
}
