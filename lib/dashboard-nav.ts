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
  { id: 'adaptive', label: 'Luyện theo lỗ hổng', href: '/adaptive', icon: Target },
  { id: 'quizzes', label: 'Ngân hàng đề kiểm tra', href: '/quizzes', icon: ClipboardList },
  { id: 'roadmap', label: 'Bản đồ tri thức', href: '/roadmap', icon: Map },
  { id: 'chat', label: 'Hỏi đáp với Zeno', href: '/chat', icon: Bot },
]
