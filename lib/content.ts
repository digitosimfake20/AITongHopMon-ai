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
  { label: 'Dành cho Giáo viên', href: '#insights' },
  { label: 'FAQ', href: '#faq' },
]

export const FEATURES: Feature[] = [
  {
    id: 'authoring',
    title: 'Tạo đề thi bằng AI trong 1 phút',
    description:
      'Tải lên bài giảng PDF hoặc chủ đề Toán 8, AI tự động soạn câu hỏi trắc nghiệm chuẩn. Thầy cô giữ lại câu hỏi thích hợp.',
    icon: Sparkles,
  },
  {
    id: 'grading',
    title: 'Chấm điểm tức thì (1.8 giây)',
    description:
      'Chấm tự động trắc nghiệm và câu hỏi tự luận ngắn theo đúng đáp án chuẩn. Mỗi câu trả lời được hiển thị rõ ràng với điểm và giải thích.',
    icon: Zap,
  },
  {
    id: 'summaries',
    title: 'Báo cáo AI bằng tiếng Việt dễ hiểu',
    description:
      'Tóm tắt 1 đoạn văn ngắn sau mỗi bài quiz: Lớp đã hiểu gì, hổng chỗ nào và cần dạy lại gì đầu tiên.',
    icon: BrainCircuit,
  },
  {
    id: 'mastery',
    title: 'Theo dõi % Độ vững Tri thức',
    description:
      'Theo dõi từng học sinh qua từng học kỳ để biết chủ đề nào đã vững, chủ đề nào cần củng cố.',
    icon: TrendingUp,
  },
  {
    id: 'groups',
    title: 'Chia sẻ Ngân hàng đề trong Tổ chuyên môn',
    description:
      'Giáo viên cùng bộ môn Toán chia sẻ ngân hàng câu hỏi và so sánh kết quả giữa các lớp.',
    icon: Users,
  },
  {
    id: 'privacy',
    title: 'Bảo mật dữ liệu học đường',
    description:
      'Dữ liệu học sinh được lưu trữ riêng biệt, không dùng để huấn luyện mô hình AI công khai.',
    icon: ShieldCheck,
  },
]

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'build',
    step: 1,
    title: 'Tạo bài kiểm tra',
    description:
      'Dùng tài liệu môn học của thầy cô hoặc để AI gợi ý bộ đề Toán 8 trong 30 giây.',
    icon: BookOpenCheck,
    bullets: [
      'Tải lên PDF hoặc nhập chủ đề Toán',
      'Chọn mức độ khó và số lượng câu hỏi',
      'Chỉnh sửa bất kỳ câu nào trước khi giao',
    ],
  },
  {
    id: 'run',
    step: 2,
    title: 'Học sinh làm bài',
    description:
      'Giao diện tối giản trên mọi thiết bị (Laptop/Máy tính bảng). Học sinh vào bằng Mã Lớp, tự động lưu bài.',
    icon: Users,
    bullets: [
      'Vào bằng Mã Lớp (không cần tài khoản)',
      'Tự động lưu mỗi câu trả lời',
      'Nhận phản hồi ngay khi nộp bài',
    ],
  },
  {
    id: 'review',
    step: 3,
    title: 'Nắm bắt tình hình lớp',
    description:
      'Điểm số, biểu đồ lỗ hổng kiến thức và Tóm tắt AI gửi trực tiếp về Dashboard trước khi tiếng chuông tan học.',
    icon: TrendingUp,
    bullets: [
      'Danh sách dạy lại theo độ ưu tiên',
      'Cảnh báo cho học sinh cần hỗ trợ',
      'Xuất dữ liệu sang bảng tính',
    ],
  },
]

export const METRICS: Metric[] = [
  {
    id: 'time',
    value: '6 Giờ',
    label: 'tiết kiệm cho mỗi giáo viên hàng tuần',
    description:
      'Đo lường từ các trường sau một kỳ học sử dụng Mathz để kiểm tra định kỳ.',
  },
  {
    id: 'grading',
    value: '< 2 Giây',
    label: 'để chấm xong toàn bộ bài làm của cả lớp',
    description:
      'Bài làm được chấm ngay khi học sinh cuối cùng nộp bài.',
  },
  {
    id: 'anti_cheat', 
    value: 'anti_cheat',
    label: 'Giam sát & Chống gian lận',
    description: 'Cảnh báo và tự động hủy kết quả nếu học sinh cố tình chuyển tab hoặc thoát màn hình làm bài hoặc công cụ khác.',
  }
]

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'Trước kia tôi phải chấm bài vào chiều chủ nhật. Bây giờ tôi đọc bản tóm tắt AI vào chiều thứ sáu và biết rõ thứ hai cần dạy gì.',
    name: 'Cô Mai Anh',
    role: 'Giáo viên Toán lớp 8',
    school: 'FPT School Hà Nội',
    initials: 'MA',
  },
  {
    id: 't2',
    quote:
      'Biểu đồ phân tích đã phát hiện ra gap trong phần Hằng đẳng thức mà bài kiểm tra cuối kỳ sẽ bỏ sót hoàn toàn.',
    name: 'Thầy Hùng',
    role: 'Trưởng bộ môn Toán',
    school: 'FPT School Bắc Ninh',
    initials: 'TH',
  },
  {
    id: 't3',
    quote:
      'Học sinh rất thích. Họ thấy điểm ngay lập tức và phản hồi chi tiết thay vì chỉ là một dấu X đỏ.',
    name: 'Cô Linh',
    role: 'Phó Hiệu trưởng Chất lượng',
    school: 'FPT School Đà Nẵng',
    initials: 'CL',
  },
]

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Gói Lớp Học',
    description: 'Dành cho 1 giáo viên bắt đầu sử dụng kiểm tra định kỳ.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: 'Vĩnh viễn',
    ctaLabel: 'Dùng thử miễn phí',
    features: [
      '1 Giáo viên, tối đa 3 lớp',
      '20 bài Quiz AI/tháng',
      'Chấm điểm tức thì',
      'Phân tích chủ đề cơ bản',
    ],
  },
  {
    id: 'pro',
    name: 'Gói Tổ Bộ Môn',
    description: 'Dành cho các giáo viên chia sẻ ngân hàng đề và so sánh kết quả.',
    monthlyPrice: 190000,
    yearlyPrice: 2280000,
    unit: 'VNĐ / Giáo viên / Tháng',
    highlighted: true,
    ctaLabel: 'Bắt đầu dùng thử',
    features: [
      'Không giới hạn lớp & quiz',
      'Báo cáo AI chi tiết',
      'Ngân hàng đề dùng chung tổ Toán',
      'Theo dõi tiến độ học sinh',
      'Xuất CSV sang Excel',
    ],
  },
  {
    id: 'school',
    name: 'Gói Toàn Trường',
    description: 'Dành cho trường học cần quản lý và báo cáo toàn diện.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: 'Liên hệ',
    ctaLabel: 'Liên hệ',
    features: [
      'Tất cả tính năng Tổ Bộ Môn',
      'Tích hợp SSO tài khoản nhà trường',
      'Quản trị viên & phân quyền',
      'Báo cáo cho ban giám hiệu',
      'Hỗ trợ tập huấn giáo viên',
    ],
  },
]

export const FAQS: FaqItem[] = [
  {
    id: 'f1',
    question: 'Học sinh có cần tạo tài khoản không?',
    answer:
      'Không, chỉ cần nhập Mã Lớp và tên. Nếu nhà trường sử dụng Google Workspace hoặc Microsoft 365, thầy cô có thể bật đăng nhập SSO để danh sách lớp tự động đồng bộ.',
  },
  {
    id: 'f2',
    question: 'AI chấm bài tự luận Toán/Văn có chính xác không?',
    answer:
      'Bài tự luận ngắn được chấm theo rubric do thầy cô đặt, mỗi điểm đều có giải thích. Thầy cô có thể xem, chỉnh sửa, hoặc ghi đè bất kỳ điểm nào — và Mathz đánh dấu những câu trả lời không chắc chắn để kiểm tra trước.',
  },
  {
    id: 'f3',
    question: 'Dữ liệu điểm số học sinh FPT có được bảo mật không?',
    answer:
      'Không bao giờ. Dữ liệu học sinh chỉ được xử lý để tạo ra kết quả và báo cáo cho nhà trường. Nó được lưu trữ ở khu vực do nhà trường chọn và không được dùng để huấn luyện mô hình AI.',
  },
  {
    id: 'f4',
    question: 'Có thể sử dụng câu hỏi riêng của giáo viên không?',
    answer:
      'Có. Thầy cô có thể viết thủ công, nhập ngân hàng câu hỏi hiện có, hoặc để Mathz soạn bộ đề sau đó chỉnh sửa. Hầu hết giáo viên sử dụng cả ba cách.',
  },
  {
    id: 'f5',
    question: 'Có hoạt động trên máy tính của trường không?',
    answer:
      'Mathz chạy trên trình duyệt trên Chromebook, iPad, laptop Windows và điện thoại. Không cần cài đặt gì cả và hoạt động ổn định ngay cả khi kết nối chậm.',
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
  'FPT School Hà Nội',
  'FPT School Bắc Ninh',
  'FPT School Đà Nẵng',
  'FPT School Cần Thơ',
]
