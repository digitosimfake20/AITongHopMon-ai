import type { TeacherDashboardData } from '@/lib/teacher-types'

/** Sample data — replace with Supabase queries later. */
export const MOCK_TEACHER_DASHBOARD: TeacherDashboardData = {
  teacherName: 'Cô Lan',
  initials: 'CL',
  className: 'Lớp 8A2',
  subject: 'Môn Toán',
  studentCount: 30,
  classAverage: 7.4,
  weeklyCompletionRate: 92,
  classWeaknesses: [
    {
      id: 'hidden-eq',
      label: 'Giải phương trình chứa ẩn',
      wrongPercent: 65,
      sampleNote: '65% lớp sai ở bước đặt ẩn và chuyển vế',
    },
    {
      id: 'factor-polynomial',
      label: 'Phân tích đa thức thành nhân tử',
      wrongPercent: 58,
      sampleNote: 'Hay nhầm dấu khi tách nhóm hạng tử',
    },
    {
      id: 'linear-system',
      label: 'Giải hệ phương trình bậc nhất',
      wrongPercent: 47,
      sampleNote: 'Thiếu kiểm tra nghiệm sau khi thay số',
    },
  ],
  atRiskStudents: [
    {
      id: 's1',
      name: 'Nguyễn Văn An',
      initials: 'NA',
      reason: 'Điểm trung bình giảm 1.2 điểm trong 2 tuần',
    },
    {
      id: 's2',
      name: 'Trần Thị Bích',
      initials: 'TB',
      reason: 'Chưa nộp 2 bài kiểm tra tuần này',
    },
    {
      id: 's3',
      name: 'Lê Minh Đức',
      initials: 'LD',
      reason: 'Hay sai dạng phương trình chứa ẩn (4/5 bài gần nhất)',
    },
  ],
  assignedQuizzes: [
    {
      id: 'q1',
      title: 'Kiểm tra 15 phút - Đại số 8A2',
      deadline: '23:59 Hôm nay',
      submitted: 28,
      total: 30,
      averageScore: 7.8,
    },
    {
      id: 'q2',
      title: 'Bài tập thích ứng - Phân tích đa thức',
      deadline: 'Thứ Sáu, 28/07',
      submitted: 24,
      total: 30,
      averageScore: 7.1,
    },
    {
      id: 'q3',
      title: 'Đề thi Giữa Kỳ 1 (Thử nghiệm)',
      deadline: 'Đã đóng',
      submitted: 30,
      total: 30,
      averageScore: 8.2,
    },
  ],
}
