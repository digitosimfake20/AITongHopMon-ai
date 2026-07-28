export interface TeacherNavItem {
  id: string
  label: string
  href: string
  icon: import('lucide-react').LucideIcon
}

export interface ClassWeakness {
  id: string
  label: string
  wrongPercent: number
  sampleNote: string
}

export interface AtRiskStudent {
  id: string
  name: string
  initials: string
  reason: string
}

export interface AssignedQuiz {
  id: string
  title: string
  deadline: string
  submitted: number
  total: number
  averageScore: number
}

export interface TeacherDashboardData {
  teacherName: string
  initials: string
  className: string
  subject: string
  studentCount: number
  classAverage: number
  weeklyCompletionRate: number
  classWeaknesses: ClassWeakness[]
  atRiskStudents: AtRiskStudent[]
  assignedQuizzes: AssignedQuiz[]
}
