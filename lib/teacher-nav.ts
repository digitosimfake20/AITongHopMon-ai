import {
  BarChart3,
  ClipboardList,
  Home,
  Users,
} from 'lucide-react'
import type { TeacherNavItem } from '@/lib/teacher-types'

export const TEACHER_NAV: TeacherNavItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan Lớp học',
    href: '/teacher',
    icon: Home,
  },
  {
    id: 'assignments',
    label: 'Giao bài & Ngân hàng Đề',
    href: '/teacher/assignments',
    icon: ClipboardList,
  },
  {
    id: 'gaps',
    label: 'Phân tích Lỗ hổng',
    href: '/teacher/gaps',
    icon: BarChart3,
  },
  {
    id: 'students',
    label: 'Danh sách Học sinh',
    href: '/teacher/students',
    icon: Users,
  },
]
