import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDirect: PrismaClient | undefined
}

/** Pooled connection (port 6543) — short reads/writes only. */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 60_000,
      timeout: 120_000,
    },
  })

/**
 * Session-mode connection (port 5432) for long interactive transactions
 * (materialize test on assign). Avoid on hot read paths.
 */
export const prismaDirect =
  globalForPrisma.prismaDirect ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 60_000,
      timeout: 120_000,
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaDirect = prismaDirect
}

export default prisma
