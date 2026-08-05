# 🗄️ 8A2 Learning Platform — Database Architecture

Hệ thống Zeno sử dụng **2 PostgreSQL Schemas** được lưu trữ và quản lý trực tiếp trên **Supabase**.

| Schema | Miền dữ liệu (Domain) | Số lượng bảng |
|---|---|---|
| **`core`** | Web Core (Lớp học, Đề thi, Bài nộp) | 7 bảng |
| **`ai`** | AI Engine (Mô hình tư duy, BKT, Trí nhớ AI) | 8 bảng |

> **Tổng cộng: 15 bảng** — Hoàn thành chuẩn xác 100% theo bản thiết kế Mô hình Dữ liệu (Data Model Spec).

---

## 🏛️ 1. Schema `core` (Trục dữ liệu chính)

### 👤 `users` — Danh sách Người dùng
| Cột (Column) | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `id` | UUID (PK) | Đồng bộ trực tiếp với Supabase Auth (`auth.users.id`) |
| `email` | TEXT (UNIQUE) | Địa chỉ Email đăng nhập |
| `full_name` | TEXT | Họ và tên người dùng |
| `role` | ENUM | Phân quyền: `student`, `teacher`, `admin` |
| `created_at` | TIMESTAMPTZ | Thời gian tạo tài khoản |

### 🏫 `classes` — Danh sách Lớp học
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | Mã định danh lớp |
| `name` | TEXT | Tên lớp (VD: *Lớp Toán 8A2*) |
| `code` | TEXT (UNIQUE) | Mã tham gia lớp (VD: `8A2-MATH`) |
| `teacher_id` | UUID | → `users.id` (Giáo viên quản lý) |
| `created_at` | TIMESTAMPTZ | Thời gian tạo lớp |

### 👥 `class_members` — Thành viên Lớp học
| Cột | Kiểu | Khóa ngoại (FK) |
|---|---|---|
| `id` | UUID (PK) | |
| `class_id` | UUID | → `classes.id` |
| `student_id` | UUID | → `users.id` (Học sinh) |
| `joined_at` | TIMESTAMPTZ | Ngày tham gia lớp |

### ❓ `questions` — Ngân hàng Câu hỏi
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `subject`, `topic`, `difficulty` | TEXT | Môn học, Chủ đề nhỏ (VD: *Nhân đa thức*), Độ khó |
| `content` | TEXT | Nội dung đề bài (Hỗ trợ công thức toán KaTeX) |
| `options` | JSONB | Danh sách phương án chọn (A, B, C, D) |
| `correct_option` | TEXT | Đáp án chuẩn xác |
| `explanation` | TEXT | Lời giải chi tiết |
| `created_at` | TIMESTAMPTZ | |

### 📝 `tests` — Đề kiểm tra & Bài tập
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `title` | TEXT | Tiêu đề bài kiểm tra |
| `class_id` | UUID | → `classes.id` |
| `question_ids` | JSONB | Mảng chứa các UUID câu hỏi |
| `time_limit_minutes` | INT | Thời gian làm bài (Phút) |
| `created_by` | UUID | → `users.id` (Người tạo đề) |
| `created_at` | TIMESTAMPTZ | |

### 📊 `submissions` — Bài nộp của Học sinh
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `test_id` | UUID | → `tests.id` |
| `student_id` | UUID | → `users.id` |
| `attempt_number` | INT | Lần thử làm bài thứ mấy |
| `score` | NUMERIC | Điểm số tổng (Quy đổi thang 10) |
| `total_questions`, `correct_count` | INT | Tổng số câu / Số câu làm đúng |
| `time_spent_seconds` | INT | Tổng thời gian thực hiện bài làm (Giây) |
| `ai_feedback_summary` | TEXT | Tóm tắt phân tích tổng quan từ AI |
| `teacher_feedback` | TEXT | Lời phê / Nhận xét của Giáo viên |
| `is_teacher_feedback_read` | BOOLEAN | Trạng thái học sinh đã đọc nhận xét chưa |
| `submitted_at` | TIMESTAMPTZ | Thời điểm nộp bài |

### 🔍 `submission_details` — Chi tiết câu trả lời từng câu
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `submission_id` | UUID | → `submissions.id` |
| `question_id` | UUID | → `questions.id` |
| `selected_option` | TEXT | Lựa chọn học sinh đã nhập/khoanh |
| `is_correct` | BOOLEAN | Kết quả Đúng hay Sai |
| `time_spent_seconds` | INT | **Dữ liệu Telemetry:** Thời gian học sinh dừng lại ở câu này |
| `ai_personalized_hint` | TEXT | Gợi ý sửa lỗi cá nhân hóa từ AI |
| `created_at` | TIMESTAMPTZ | |

---

## 🧠 2. Schema `ai` (Bộ não & Trí nhớ AI Engine)

### 🌳 `knowledge_nodes` — Cấu trúc Cây Kiến thức
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT (PK) | Mã node kiến thức chuẩn (VD: `math-8-algebra-linear-eq`) |
| `subject`, `title` | TEXT | Môn học và Tên khái niệm kiến thức |
| `parent_node_id` | TEXT | Tự tham chiếu (Self-ref) xây dựng Cây Cấu trúc |
| `difficulty_level` | INT | Mức độ phức tạp của node |

### 📈 `student_knowledge_states` — Mức độ Thành thạo Kiến thức (BKT)
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `student_id` | UUID | → `core.users.id` |
| `node_id` | TEXT | → `knowledge_nodes.id` |
| `p_mastery` | NUMERIC | Xác suất thành thạo tính theo thuật toán BKT |
| `last_practiced_at` | TIMESTAMPTZ | Lần thực hành gần nhất |

### 👤 `student_cognitive_profiles` — Hồ sơ Năng lực Tư duy
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `student_id` | UUID (PK) | → `core.users.id` (Mối quan hệ 1:1) |
| `persona_type` | TEXT | Phân loại phong cách học tập của học sinh |
| `avg_speed_per_question` | NUMERIC | Tốc độ xử lý trung bình mỗi câu hỏi |
| `careless_error_rate` | NUMERIC | Tỷ lệ mắc lỗi ẩu (Làm nhanh nhưng sai) |
| `strengths_summary` | TEXT[] | Mảng liệt kê các điểm mạnh |
| `weaknesses_summary` | TEXT[] | Mảng liệt kê các lỗ hổng kiến thức |
| `updated_at` | TIMESTAMPTZ | Thời gian cập nhật hồ sơ gần nhất |

### 💬 `chat_sessions` — Phiên Trợ lý AI Trò chuyện
| Cột | Kiểu | Khóa ngoại (FK) |
|---|---|---|
| `id` | UUID (PK) | |
| `student_id` | UUID | → `core.users.id` |
| `subject`, `title` | TEXT | Môn học và Tiêu đề cuộc hội thoại |
| `message_count` | INT | Tổng số tin nhắn trong phiên |
| `created_at` | TIMESTAMPTZ | |

### 🔐 `chat_messages` — Tin nhắn Chat (Mã hóa Bảo mật)
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `session_id` | UUID | → `chat_sessions.id` |
| `sender` | TEXT | `student` / `assistant` / `system` |
| `encrypted_content` | TEXT | Nội dung tin nhắn mã hóa chuẩn **AES-256-GCM** |
| `iv`, `auth_tag` | TEXT | Khóa và Tag xác thực mã hóa |
| `sequence_number` | INT | Thứ tự tin nhắn (Dùng để Trigger tóm tắt trí nhớ) |
| `created_at` | TIMESTAMPTZ | |

### 📦 `chat_chunk_summaries` — Trí nhớ Ngắn hạn AI (Cấp 1)
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `session_id` | UUID | → `chat_sessions.id` |
| `start_seq`, `end_seq` | INT | Đoạn tin nhắn tóm tắt (Mỗi cụm 15 tin nhắn) |
| `summary_json` | JSONB | Nội dung tóm tắt ngữ cảnh cấp 1 |
| `created_at` | TIMESTAMPTZ | |

### 🧠 `global_agent_memories` — Trí nhớ Dài hạn Toàn cục (Cấp 2)
| Cột | Kiểu | Khóa ngoại (FK) / Ghi chú |
|---|---|---|
| `id` | UUID (PK) | |
| `student_id` | UUID (UNIQUE) | → `core.users.id` |
| `long_term_summary` | TEXT | Bộ nhớ điều hành Zeno ghi nhớ sâu sắc về học sinh |
| `key_insights` | JSONB | Các phát hiện tư duy/tính cách quan trọng |
| `total_processed_messages` | INT | Số tin nhắn đã xử lý (Cập nhật sau mỗi 100 msgs) |
| `updated_at` | TIMESTAMPTZ | |

---

## 🔗 Mô hình Sơ đồ Quan hệ (Entity Relationships)

```text
core.users ───────< core.classes (teacher_id)
core.classes ─────< core.class_members (class_id)
core.users ───────< core.class_members (student_id)
core.classes ─────< core.tests (class_id)
core.users ───────< core.tests (created_by)
core.tests ───────< core.submissions (test_id)
core.users ───────< core.submissions (student_id)
core.submissions ─< core.submission_details (submission_id)
core.questions ───< core.submission_details (question_id)

core.users ───────< ai.student_knowledge_states (student_id)
ai.knowledge_nodes< ai.student_knowledge_states (node_id)
core.users ───────  ai.student_cognitive_profiles (1:1)
core.users ───────< ai.chat_sessions (student_id)
ai.chat_sessions ─< ai.chat_messages (session_id)
ai.chat_sessions ─< ai.chat_chunk_summaries (session_id)
core.users ───────  ai.global_agent_memories (1:1)