import type { StudentDashboardData } from '@/lib/dashboard-types'

/** Sample data — replace with Supabase queries later. */
export const MOCK_STUDENT_DASHBOARD: StudentDashboardData = {
  studentName: 'Minh',
  initials: 'M',
  classLabel: 'Toán 8',
  masteryScore: 8.5,
  masteryPercent: 68,
  completedQuizzes: 14,
  studyHours: 3.5,
  streakDays: 5,
  adaptiveChapter: 'Chương 2: Phân tích đa thức thành nhân tử',
  adaptiveTitle: 'Chương 2: Phân tích đa thức thành nhân tử',
  adaptiveDescription:
    'Hệ thống đã chọn lọc 5 câu hỏi khớp chính xác với tốc độ và khả năng của bạn.',
  weakTopics: [
    {
      id: 'linear-eq',
      label: 'Giải phương trình bậc nhất',
      accuracy: 40,
      severity: 'weak',
    },
    {
      id: 'radical-simplify',
      label: 'Rút gọn biểu thức chứa căn',
      accuracy: 52,
      severity: 'moderate',
    },
  ],
  zenoInsight:
    'Minh làm phần đại số rất nhanh và chính xác. Tuy nhiên, hãy chú ý quy tắc đổi dấu khi chuyển vế trong bài thi sắp tới nhé!',
  zenoUpdatedAt: 'Cập nhật 10 phút trước',
  assignments: [
    {
      id: 'quiz-15',
      title: 'Kiểm tra 15 phút - Đại số 8A2',
      deadline: '23:59 Hôm nay',
      status: 'pending',
    },
    {
      id: 'midterm-1',
      title: 'Đề thi Giữa Kỳ 1 (Thử nghiệm)',
      status: 'completed',
      score: '9.0/10',
    },
  ],
}
