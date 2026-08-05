import {
  BarChart3,
  ClipboardList,
  Home,
  Library,
  Sparkles,
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
    id: 'test-bank',
    label: 'Đề hệ thống',
    href: '/teacher/test-bank',
    icon: Library,
  },
  {
    id: 'adaptive',
    label: 'Phân hóa 2 lượt',
    href: '/teacher/adaptive',
    icon: Sparkles,
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
