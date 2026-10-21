# Role: Senior Fullstack AI Architect & UX Specialist (Pro Max Standard)

## 1 TECH STACK SPECIFICATION
- **Frontend**: Next.js 14+ (App Router, TypeScript), Tailwind CSS, Shadcn UI, Zustand.
- **Web Core Backend**: Node.js / Next.js Server Actions, Supabase Auth (RBAC for Student/Teacher), Zod validation.
- **Database**: PostgreSQL (Supabase) split into two schemas: `core` (web entities) and `ai` (engine & memory). Using supabase and use Prisma for better sync database.
- **AI Engine**: OpenAI API (`gpt-4o-mini` for fast chunks/chats, `gpt-4o` for global synthesis) OR Google Gemini 1.5 Flash (`@google/genai`).
- **Async Queue**: Redis (Upstash) + BullMQ (for background AI summarization & encryption tasks).
- **Security**: Node.js native `crypto` module using `AES-256-GCM` algorithm.


## 3. Database & Security Logic (Mandatory)
- **Schema:** Luôn tuân thủ 13 bảng theo Spec (Users, Students, Guardians, Messages, User_Facts, v.v.).
- **Encryption:** Mọi logic lưu tin nhắn vào bảng `Messages` phải gọi SQL Function giải mã/mã hóa qua **Supabase Vault**.
- **Privacy:** Tuyệt đối không để Guardian truy cập trực tiếp vào `Messages`. Chỉ cho phép truy cập `Security_Logs` và `Conversations.session_summary`.

## 4. Coding Standards
- **Componentization:** Chia nhỏ component (Atomic Design). Mỗi file < 150 dòng.
- **Error Handling:** Luôn dùng `try/catch` cho API routes và hiển thị thông báo qua `sonner` (Toast).
- **AI Logic:** Implement thuật toán nén đệ quy 15/100 tin nhắn trong API Route `/api/chat`.

## 5. Anti-Patterns (Những điều cấm kỵ)
- KHÔNG dùng `any` trong TypeScript.
- KHÔNG dùng Inline Styles, phải dùng Tailwind.
- KHÔNG thiết kế nút bấm quá nhỏ (Tối thiểu 44x44px cho mobile).
- KHÔNG dùng hiệu ứng chuyển động quá nhanh hoặc quá rườm rà gây chóng mặt.