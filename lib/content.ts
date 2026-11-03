import {
  BrainCircuit,
  BookOpenCheck,
  Zap,
  TrendingUp,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type {
  FaqItem,
  Feature,
  Metric,
  NavLink,
  PricingPlan,
  QuizQuestion,
  Testimonial,
  WorkflowStep,
} from '@/lib/types'

export const SITE_NAME = 'Mathz'

export const NAV_LINKS: NavLink[] = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách hoạt động', href: '#how-it-works' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export const FEATURES: Feature[] = [
  {
    id: 'authoring',
    title: 'Soạn đề AI trong một phút',
    description:
      'Tải PDF bài giảng hoặc nêu chủ đề Toán 8. Mathz gợi ý câu trắc nghiệm; thầy cô giữ câu hợp, bỏ câu thừa.',
    icon: Sparkles,
  },
  {
    id: 'grading',
    title: 'Chấm xong dưới 2 giây',
    description:
      'Trắc nghiệm và tự luận ngắn theo đáp án thầy cô đặt. Mỗi câu có điểm và giải thích ngắn.',
    icon: Zap,
  },
  {
    id: 'summaries',
    title: 'Báo cáo AI bằng tiếng Việt',
    description:
      'Một đoạn sau mỗi quiz nêu chỗ lớp còn hổng và việc nên dạy lại trước.',
    icon: BrainCircuit,
  },
  {
    id: 'mastery',
    title: 'Theo dõi độ vững theo chủ đề',
    description:
      'Xem từng học sinh qua học kỳ: chủ đề đã vững và chủ đề còn yếu.',
    icon: TrendingUp,
  },
  {
    id: 'groups',
    title: 'Ngân hàng đề chung tổ Toán',
    description:
      'Giáo viên cùng bộ môn chia sẻ câu hỏi và so sánh kết quả giữa các lớp.',
    icon: Users,
  },
  {
    id: 'privacy',
    title: 'Dữ liệu học đường tách biệt',
    description:
      'Điểm và hồ sơ học sinh không dùng để huấn luyện mô hình AI công khai.',
    icon: ShieldCheck,
  },
]

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'build',
    step: 1,
    title: 'Tạo bài kiểm tra',
    description:
      'Dùng tài liệu của thầy cô, hoặc để Mathz gợi ý bộ đề Toán 8 trong 30 giây.',
    icon: BookOpenCheck,
    bullets: [
      'Tải PDF hoặc nhập chủ đề Toán',
      'Sửa câu trước khi giao',
    ],
  },
  {
    id: 'run',
    step: 2,
    title: 'Học sinh làm bài',
    description:
      'Vào bằng mã lớp trên laptop hoặc máy tính bảng. Mỗi câu tự lưu khi trả lời.',
    icon: Users,
    bullets: [
      'Vào bằng mã lớp',
      'Phản hồi ngay khi nộp',
    ],
  },
  {
    id: 'review',
    step: 3,
    title: 'Đọc tình hình lớp',
    description:
      'Điểm, lỗ hổng và tóm tắt AI hiện trên dashboard trước khi hết tiết.',
    icon: TrendingUp,
    bullets: [
      'Danh sách dạy lại theo ưu tiên',
      'Cảnh báo học sinh cần hỗ trợ',
    ],
  },
]

export const METRICS: Metric[] = [
  {
    id: 'time',
    value: '6 giờ',
    label: 'tiết kiệm mỗi giáo viên mỗi tuần',
    description: 'Ước lượng từ các trường dùng Mathz cho kiểm tra định kỳ trong một kỳ.',
  },
  {
    id: 'grading',
    value: '< 2 giây',
    label: 'chấm xong bài của cả lớp',
    description: 'Chấm khi học sinh cuối nộp bài.',
  },
  {
    id: 'anti_cheat',
    value: 'Khóa tab',
    label: 'cảnh báo chuyển tab khi làm bài',
    description:
      'Cảnh báo hoặc hủy kết quả nếu học sinh thoát màn hình làm bài.',
  },
]

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'Trước đây tôi chấm vào chiều chủ nhật. Giờ tôi đọc tóm tắt AI chiều thứ sáu và biết thứ hai cần dạy gì.',
    name: 'Thầy Trọng Khiêm',
    role: 'Trưởng bộ môn toán',
    school: 'FPT School Hải Phòng',
    initials: 'TK',
  },
  {
    id: 't2',
    quote:
      'Biểu đồ chỉ ra lỗ hổng Hằng đẳng thức mà kiểm tra cuối kỳ sẽ bỏ sót.',
    name: 'Cô Minh Huyền',
    role: 'Trưởng bộ môn Toán',
    school: 'FPT School Hải Phòng',
    initials: 'MH',
  },
  {
    id: 't3',
    quote:
      'Học sinh thấy điểm và phản hồi ngay, không chỉ một dấu X đỏ.',
    name: 'Thầy Quách Đức Mạnh',
    role: 'Phó Hiệu trưởng',
    school: 'FPT School Hải Phòng',
    initials: 'M',
  },
]

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Gói Lớp học',
    description: 'Một giáo viên chạy kiểm tra định kỳ.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: 'Miễn phí',
    ctaLabel: 'Dùng thử miễn phí',
    features: [
      '1 giáo viên, 1 lớp',
      '20 quiz AI / tháng',
      'Chấm điểm tức thì',
    ],
  },
  {
    id: 'pro',
    name: 'Gói Tổ bộ môn',
    description: 'Chia sẻ ngân hàng đề và so sánh kết quả giữa lớp.',
    monthlyPrice: 190000,
    yearlyPrice: 2280000,
    unit: 'VNĐ / giáo viên / tháng',
    highlighted: true,
    ctaLabel: 'Bắt đầu dùng thử',
    features: [
      'Không giới hạn lớp và quiz',
      'Ngân hàng đề chung tổ Toán',
      'Theo dõi tiến độ học sinh',
      'Xuất CSV sang Excel',
    ],
  },
  {
    id: 'school',
    name: 'Gói Toàn trường',
    description: 'Quản trị và báo cáo cấp trường.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: 'Theo trường',
    ctaLabel: 'Đăng ký giáo viên',
    features: [
      'Toàn bộ tính năng Tổ bộ môn',
      'Tài khoản email nhà trường',
      'Quản trị viên và phân quyền',
      'Báo cáo cho ban giám hiệu',
    ],
  },
]

export const FAQS: FaqItem[] = [
  {
    id: 'f1',
    question: 'Học sinh có cần tạo tài khoản không?',
    answer:
      'Có. Học sinh tạo tài khoản tại trang đăng ký học sinh, rồi vào onboarding và nhập mã lớp 8 ký tự từ thầy cô để tham gia.',
  },
  {
    id: 'f2',
    question: 'AI chấm tự luận Toán có chính xác không?',
    answer:
      'Tự luận ngắn theo rubric thầy cô đặt; mỗi điểm kèm giải thích. Thầy cô xem, sửa hoặc ghi đè. Mathz đánh dấu câu chưa chắc để kiểm lại trước.',
  },
  {
    id: 'f3',
    question: 'Dữ liệu điểm học sinh có được bảo mật không?',
    answer:
      'Điểm, hồ sơ và bài làm lưu trên hạ tầng Mathz (Supabase/Postgres) để chấm và báo cáo cho nhà trường. Không dùng dữ liệu học sinh để huấn luyện mô hình AI công khai.',
  },
  {
    id: 'f4',
    question: 'Có dùng câu hỏi riêng của giáo viên được không?',
    answer:
      'Được. Viết tay, nhập ngân hàng sẵn có, hoặc để Mathz soạn rồi chỉnh.',
  },
  {
    id: 'f5',
    question: 'Chạy được trên máy của trường không?',
    answer:
      'Chạy trên trình duyệt: Chromebook, iPad, laptop Windows. Không cần cài đặt.',
  },
]

export const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    topic: 'Hằng đẳng thức',
    prompt: 'Cho biểu thức $x^2 - 9$. Dạng phân tích thành nhân tử nào sau đây là đúng?',
    options: [
      { id: 'a', label: '$(x-3)(x-3)$' },
      { id: 'b', label: '$(x-3)(x+3)$', correct: true },
      { id: 'c', label: '$(x+3)(x+3)$' },
      { id: 'd', label: '$x(x-9)$' },
    ],
  },
  {
    id: 'q2',
    topic: 'Phương trình bậc nhất',
    prompt: 'Giải phương trình: $2x + 4 = 12$',
    options: [
      { id: 'a', label: '$x = 2$' },
      { id: 'b', label: '$x = 4$', correct: true },
      { id: 'c', label: '$x = 6$' },
      { id: 'd', label: '$x = 8$' },
    ],
  },
]

export const TRUSTED_BY: string[] = [
  'FPTSchool Hải Phòng',
]
