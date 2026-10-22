import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Supabase / PgBouncer on Vercel: cap connections per serverless instance.
 * Pool is often ~15 session slots — without this, concurrent lambdas exhaust it.
 */
function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw
  let url = raw
  const sep = () => (url.includes('?') ? '&' : '?')

  if (!url.includes('connection_limit=')) {
    url = `${url}${sep()}connection_limit=1`
  }
  if (url.includes(':6543') && !url.includes('pgbouncer=')) {
    url = `${url}${sep()}pgbouncer=true`
  }
  return url
}

const databaseUrl = serverlessDatabaseUrl(process.env.DATABASE_URL)

function createClient(): PrismaClient {
  return new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 15_000,
      timeout: 60_000,
    },
  })
}

/** Single pooled client — do not open a second session-mode client per lambda. */
export const prisma = globalForPrisma.prisma ?? createClient()

/**
 * @deprecated Use `prisma` — same instance. Kept for imports; avoids doubling DB connections on Vercel.
 * Migrations / `db push` use DIRECT_URL via schema `directUrl`, not this export.
 */
export const prismaDirect = prisma

globalForPrisma.prisma = prisma

export default prisma
