import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Constructed = { url?: string }

const constructed: Constructed[] = []

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {
    constructor(opts?: { datasources?: { db?: { url?: string } } }) {
      constructed.push({ url: opts?.datasources?.db?.url })
    }
    $transaction = vi.fn()
  },
}))

function clearPrismaGlobals() {
  const g = globalThis as {
    prisma?: unknown
    prismaDirect?: unknown
    prismaUrlLogged?: boolean
  }
  delete g.prisma
  delete g.prismaDirect
  delete g.prismaUrlLogged
}

describe('prismaDirect construction', () => {
  const prevDatabaseUrl = process.env.DATABASE_URL
  const prevDirectUrl = process.env.DIRECT_URL

  beforeEach(() => {
    constructed.length = 0
    clearPrismaGlobals()
    vi.resetModules()
    process.env.DATABASE_URL =
      'postgresql://user:pass@aws-0-ap.pooler.supabase.com:6543/postgres'
    process.env.DIRECT_URL =
      'postgresql://user:pass@aws-0-ap.pooler.supabase.com:5432/postgres'
  })

  afterEach(() => {
    clearPrismaGlobals()
    if (prevDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = prevDatabaseUrl
    if (prevDirectUrl === undefined) delete process.env.DIRECT_URL
    else process.env.DIRECT_URL = prevDirectUrl
  })

  it('builds a separate client on DIRECT_URL (not an alias of the pooler client)', async () => {
    const mod = await import('@/lib/prisma')

    expect(mod.prismaDirect).not.toBe(mod.prisma)
    expect(constructed).toHaveLength(2)

    const poolerUrl = constructed[0]?.url ?? ''
    const directUrl = constructed[1]?.url ?? ''

    expect(poolerUrl).toContain(':6543')
    expect(poolerUrl).toContain('pgbouncer=true')
    expect(directUrl).toContain(':5432')
    expect(directUrl).not.toContain(':6543')
    expect(directUrl).not.toContain('pgbouncer=true')
  })

  it('keeps DIRECT_URL on session port when DATABASE_URL was session-rewritten', async () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@aws-0-ap.pooler.supabase.com:5432/postgres'
    process.env.DIRECT_URL =
      'postgresql://user:pass@aws-0-ap.pooler.supabase.com:5432/postgres'

    await import('@/lib/prisma')

    expect(constructed[0]?.url).toContain(':6543')
    expect(constructed[1]?.url).toContain(':5432')
    expect(constructed[1]?.url).not.toContain(':6543')
  })
})

describe('interactive path smoke', () => {
  it('generate-smart-quiz uses prismaDirect.$transaction', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../app/actions/generate-smart-quiz.ts'),
      'utf8',
    )
    expect(src).toMatch(/prismaDirect\.\$transaction/)
    expect(src).toMatch(/import prisma, \{ prismaDirect \} from '@\/lib\/prisma'/)
  })
})
