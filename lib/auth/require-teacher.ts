const TEACHER_REQUIRED = 'Chỉ giáo viên mới có thể thực hiện thao tác này.'

export function requireTeacher(user: { role: string } | null): string | null {
  if (user?.role === 'teacher' || user?.role === 'admin') return null
  return TEACHER_REQUIRED
}
