# Mathz | Nền tảng học có AI (Zeno)

| Ai | Làm được gì |
|---|---|
| **Học sinh** | Làm bài, xem điểm, bản đồ tri thức, chat Zeno, bài luyện 10 phút trộn từ kho đề |
| **Giáo viên** | Giao bài, cụm đề adaptive 2 lượt (TB → Dễ/Khó), bản đồ gap lớp, quản lý HS |
| **Admin** | Upload kho đề `system_tests`, nhóm đề 3 mức EASY / MEDIUM / HARD |

**Zeno AI:** nhận xét chủ động, gợi ý ôn chỗ yếu, trộn câu Dễ + TB từ DB (không bịa đề lạ).

---

### Cần có sẵn

- **Node.js 20+** ([nodejs.org](https://nodejs.org)): gõ `node -v` thấy số phiên bản
- **pnpm**: `npm install -g pnpm`
- Máy có mạng lần đầu (cài package + gọi Supabase/OpenAI)
- File **`.env`** (copy từ `.env.example`, điền key thật; **đừng commit lên git**)

### Chạy local

```bash
# 1. Vào folder project (trên USB hoặc copy ra ổ C)
cd AITongHopMon-ai

# 2. Cài dependency
pnpm install

# 3. Sync database (lần đầu hoặc sau khi đổi schema)
pnpm db:push

# 4. Chạy dev
pnpm dev
```

Mở trình duyệt: **http://localhost:3000**

Nếu project nằm trên USB 2.0, copy sang ổ nội bộ (ví dụ `C:\Projects\...`) trước khi `pnpm install` để tránh chậm vì `node_modules`.

### Build production

```bash
pnpm build
pnpm start
```

---

## `.env`: điền gì?

Copy `.env.example` → `.env`, rồi điền:

| Biến | Giải thích ngắn |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (public ok) |
| `SUPABASE_SERVICE_ROLE_KEY` | Key server; **giữ kín** |
| `DATABASE_URL` | Postgres pooler port **6543** + `?pgbouncer=true` |
| `DIRECT_URL` | Postgres session port **5432** (migrate / db push) |
| `OPENAI_API_KEY` | Key OpenAI cho Zeno + phân tích |
| `GEMINI_API_KEY` | Key Gemini cho nhập đề từ PDF/ảnh |
| `CHAT_ENCRYPTION_KEY` | Random string dài (mã hóa chat) |

Thiếu `OPENAI_API_KEY`: app vẫn chạy; chức năng AI tạm tắt.

---

## Luồng demo (5–7 phút)

1. **Landing** `/`: giới thiệu nhanh
2. **Đăng ký / đăng nhập** `/signup` · `/login`
3. **Onboarding**: GV tạo lớp · HS join bằng mã
4. **HS Dashboard** `/dashboard`: card Zeno chào + streak + gợi ý luyện 10p
5. **Ngân hàng đề** `/quizzes`: tab Theo môn / Trạng thái / Làm sau
6. **Làm bài**: pre-test “Sẵn sàng chưa?” → timer chạy nền → nộp → `/quiz/result/...`
7. **GV** `/teacher`: giao adaptive, xem `/teacher/classes/[id]/gaps`
8. **Admin** `/admin/test-bank`: kho đề hệ thống

---

## Route chính

### Học sinh

| URL | Là gì |
|---|---|
| `/dashboard` | Trang chủ HS |
| `/quizzes` | Danh sách bài (có group + tab) |
| `/adaptive` | Bài thích ứng |
| `/roadmap` | Bản đồ tri thức |
| `/chat` | Hỏi Zeno |
| `/quiz/take/[testId]` | Làm bài |
| `/quiz/result/[id]` | Xem điểm + review |

### Giáo viên

| URL | Là gì |
|---|---|
| `/teacher` | Dashboard GV |
| `/teacher/test-bank` | Kho đề lớp |
| `/teacher/adaptive` | Giao cụm adaptive 2 lượt |
| `/teacher/classes/[classId]/gaps` | Bản đồ gap kiến thức lớp |
| `/teacher/students` | Danh sách HS |

### Admin

| URL | Là gì |
|---|---|
| `/admin/test-bank` | Upload / quản lý kho đề hệ thống |

---

## Tech stack

- **Next.js 16** + TypeScript + Tailwind + Shadcn
- **Supabase**: Auth + PostgreSQL
- **Prisma**: ORM (schema `core` + `ai`)
- **OpenAI**: Zeno chat, phân tích bài làm, canonicalize topic
- **BKT**: cập nhật mastery theo chủ đề

---

## Lệnh hay dùng

```bash
pnpm dev          # chạy local
pnpm build        # build production
pnpm db:push      # đẩy schema Prisma lên Supabase
pnpm db:studio    # xem DB visual (Prisma Studio)
pnpm lint         # check code
pnpm loadtest:dry # smoke load test (public routes)
```

---

## Load testing

Isolated harness under `loadtest/` (Node native `fetch`, not k6/Artillery — see [loadtest/README.md](./loadtest/README.md)).

```bash
# Dry smoke (no prod confirm)
pnpm loadtest:dry
# or: node loadtest/run.mjs --profile dry

# Modest against local
BASE_URL=http://localhost:3000 pnpm loadtest

# Modest / aggressive against default Vercel host (costs / rate limits — confirm required)
LOADTEST_CONFIRM_PROD=1 pnpm loadtest
LOADTEST_CONFIRM_PROD=1 pnpm loadtest:aggressive
```

Auth hot paths need `LOADTEST_COOKIE` (browser Cookie header; never commit). Results go to gitignored `loadtest/results/`.

---

## Lỗi quen thuộc

| Triệu chứng | Thử |
|---|---|
| `fail to open trans in time` | Check `DIRECT_URL` port 5432, restart `pnpm dev` |
| Trang trắng / hydration error | Hard refresh `Ctrl+Shift+R` |
| Nộp bài lâu | Lần đầu compile chậm; lần sau nhanh hơn (AI chạy nền) |
| Không login được | Check Supabase URL + anon key trong `.env` |
| `pnpm` không có | `npm install -g pnpm` |

---

## Nộp USB / nộp BGK

**Nên có trong USB:**

- Toàn bộ source (trừ `node_modules`, `.next`; cài lại được)
- File **`.env.example`** (mẫu)
- File **`.env`** riêng (USB nộp BGK; **không public**)
- **`README.md`** này

**Không cần copy:** `node_modules/`, `.next/` (nặng; BGK chạy `pnpm install`).

---

## Team / ghi chú

- Logo: `public/fpt.png`
- Tên app: **Mathz** (site) · repo: **AITongHopMon-ai**
- Adaptive 2 lượt: L1 luôn TB · L2 &lt; 8.0 → Dễ · ≥ 8.0 → Khó
