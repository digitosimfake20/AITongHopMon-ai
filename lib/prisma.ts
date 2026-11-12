import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDirect: PrismaClient | undefined
  prismaUrlLogged: boolean | undefined
}

/**
 * Supabase on Vercel must use **transaction pooler** (6543), not session pooler (5432).
 * Session pool is ~15 slots — concurrent serverless invocations exhaust it quickly.
 */
function normalizeEnvDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw
  let url = raw.trim()
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim()
  }
  return url
}

function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  const normalized = normalizeEnvDatabaseUrl(raw)
  if (!normalized) return normalized
  let url = normalized
  let rewritten = false

  if (/pooler\.supabase\.(com|co)/i.test(url)) {
    if (/:5432(\/|\?|$)/.test(url)) {
      url = url.replace(/:5432(\/|\?)/, ':6543$1')
      rewritten = true
    }
  }

  const sep = () => (url.includes('?') ? '&' : '?')

  if (!url.includes('connection_limit=')) {
    url = `${url}${sep()}connection_limit=1`
  }
  if (url.includes(':6543') && !url.includes('pgbouncer=')) {
    url = `${url}${sep()}pgbouncer=true`
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !globalForPrisma.prismaUrlLogged &&
    rewritten
  ) {
    globalForPrisma.prismaUrlLogged = true
    console.warn(
      '[prisma] DATABASE_URL pointed at Supabase session pooler (:5432); runtime rewrote to :6543. Set Vercel DATABASE_URL to port 6543 with ?pgbouncer=true.',
    )
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !globalForPrisma.prismaUrlLogged &&
    /pooler\.supabase\.(com|co)/i.test(url) &&
    /:5432(\/|\?|$)/.test(url)
  ) {
    globalForPrisma.prismaUrlLogged = true
    console.error(
      '[prisma] DATABASE_URL still uses session pooler (:5432) — expect EMAXCONNSESSION under load. Use transaction pooler :6543.',
    )
  }

  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error(
      '[prisma] DATABASE_URL must start with postgresql:// or postgres:// — check Vercel env (no quotes, full URI).',
    )
  }

  return url
}

/** Session/direct URL for interactive $transaction — never rewrite :5432 → :6543. */
function sessionDirectDatabaseUrl(raw: string | undefined): string | undefined {
  const normalized = normalizeEnvDatabaseUrl(raw)
  if (!normalized) return normalized
  let url = normalized
  if (!url.includes('connection_limit=')) {
    url = `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`
  }
  return url
}

const databaseUrl = serverlessDatabaseUrl(process.env.DATABASE_URL)
const directUrl = sessionDirectDatabaseUrl(process.env.DIRECT_URL)

function createClient(url: string | undefined): PrismaClient {
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 15_000,
      timeout: 60_000,
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createClient(databaseUrl)
// Interactive txs need a session client; pooler alias breaks under PgBouncer transaction mode.
export const prismaDirect =
  globalForPrisma.prismaDirect ?? createClient(directUrl ?? databaseUrl)

globalForPrisma.prisma = prisma
globalForPrisma.prismaDirect = prismaDirect

export default prisma
