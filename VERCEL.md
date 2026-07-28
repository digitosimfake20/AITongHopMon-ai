# Vercel Deployment — Mathz / 8A2 Platform

## 1. Push to GitHub

Repository: `https://github.com/digitosimfake20/AITongHopMon-ai`

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Build command: `pnpm build` (default)
5. Install command: `pnpm install`

## 3. Environment Variables (Required)

Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (server only) |
| `DATABASE_URL` | Production, Preview — Supavisor **transaction** mode (`pooler.supabase.com:6543?pgbouncer=true`) |
| `DIRECT_URL` | Production, Preview — Supavisor **session** mode (`pooler.supabase.com:5432`) |

Copy both from **Supabase → Connect**. Use username `postgres.[PROJECT-REF]`, not `postgres@db.*`.
| `OPENAI_API_KEY` | Production, Preview |
| `CHAT_ENCRYPTION_KEY` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | Production = your Vercel URL |

Optional later: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## 4. Supabase Auth redirect URLs

In **Supabase → Authentication → URL Configuration**, add:

- Site URL: `https://YOUR-VERCEL-URL.vercel.app`
- Redirect URLs:
  - `https://YOUR-VERCEL-URL.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 5. Deploy

Click **Deploy**. Vercel runs `postinstall` → `prisma generate` → `next build`.

## Routes after deploy

| Path | Purpose |
|---|---|
| `/login`, `/signup` | Supabase Auth |
| `/onboarding` | Join / create class |
| `/dashboard` | Student dashboard |
| `/teacher` | Teacher dashboard |
