# AITongHopMon-ai

Mathz — Adaptive Learning Platform with AI tutor (Zeno) for Math grade 8.

## Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js Server Actions / API routes, Supabase Auth, Prisma
- **Database:** PostgreSQL (Supabase) — schemas `core` + `ai`
- **AI:** OpenAI API, encrypted chat, recursive summarization (15/100 messages)

## Setup

1. Copy `.env.example` → `.env` and fill in all values.
2. `pnpm install`
3. `pnpm dev` → http://localhost:3000

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/auth` | Login / Signup |
| `/dashboard` | Student dashboard |
| `/teacher` | Teacher dashboard |

## Environment

See `.env.example` for the full list of required variables.
