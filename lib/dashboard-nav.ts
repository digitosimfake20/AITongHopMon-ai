import {
  Bot,
  ClipboardList,
  Home,
  Map,
  Target,
} from 'lucide-react'
import type { DashboardNavItem } from '@/lib/dashboard-types'

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { id: 'overview', label: 'Tổng quan', href: '/dashboard', icon: Home },
  { id: 'adaptive', label: 'Bài tập Thích ứng', href: '/adaptive', icon: Target },
  { id: 'quizzes', label: 'Ngân hàng Quiz', href: '/quizzes', icon: ClipboardList },
  { id: 'roadmap', label: 'Bản đồ Tri thức', href: '/roadmap', icon: Map },
  { id: 'chat', label: 'Hỏi đáp Zeno AI', href: '/chat', icon: Bot },
]
