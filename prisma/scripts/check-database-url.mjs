/**
 * Validate DATABASE_URL (and optional DIRECT_URL) from env or .env, then test SELECT 1.
 *
 * Usage:
 *   pnpm db:check-url
 *   pnpm db:check-url -- --direct
 *   set DATABASE_URL=postgresql://... && pnpm db:check-url
 */
import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  const shellBefore = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  }
  const fromFile = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    fromFile[key] = val
  }
  for (const [key, val] of Object.entries(fromFile)) {
    process.env[key] = val
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    const shell = shellBefore[key]
    const file = fromFile[key]
    if (shell && file && normalizeUrl(shell) !== normalizeUrl(file)) {
      console.warn(
        `\n⚠ Shell ${key} was set (e.g. $env:${key}=...) and differed from .env — using .env. Run: Remove-Item Env:${key}\n`,
      )
    }
  }
}

/** Warn if PowerShell `$env:DATABASE_URL=...` was set before pnpm — .env now wins. */
function warnIfEmptyPassword(url, name) {
  if (!url) return
  if (/:\/\/[^:@/]+:@/i.test(url)) {
    console.error(
      `  ✗ ${name} has empty password (postgres.xxx:@host) — paste DB password from Supabase between : and @`,
    )
    return true
  }
  return false
}

function normalizeUrl(raw) {
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

function applyServerlessParams(url) {
  if (!url) return url
  const sep = () => (url.includes('?') ? '&' : '?')
  if (!url.includes('connection_limit=')) {
    url = `${url}${sep()}connection_limit=1`
  }
  if (url.includes(':6543') && !url.includes('pgbouncer=')) {
    url = `${url}${sep()}pgbouncer=true`
  }
  return url
}

function projectRefFromUrl(url) {
  const dbHost = url.match(/db\.([a-z0-9]+)\.supabase\.co/i)?.[1]
  if (dbHost) return dbHost
  const poolUser = url.match(/\/\/postgres\.([a-z0-9]+):/i)?.[1]
  if (poolUser) return poolUser
  return null
}

function redactUrl(url) {
  try {
    const u = new URL(url.replace(/^postgresql:/, 'http:').replace(/^postgres:/, 'http:'))
    if (u.password) u.password = '***'
    return u.toString().replace(/^http:/, 'postgresql:')
  } catch {
    return url.replace(/:([^:@/]+)@/, ':***@')
  }
}

function validateFormat(name, raw) {
  const issues = []
  if (!raw) {
    issues.push(`${name} is missing or empty`)
    return { ok: false, url: raw, issues }
  }
  const url = normalizeUrl(raw)
  if (!url) {
    issues.push(`${name} is empty after trim`)
    return { ok: false, url, issues }
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    issues.push(
      `${name} must start with postgresql:// or postgres:// (got: ${JSON.stringify(url.slice(0, 40))}...)`,
    )
  }
  if (/^DATABASE_URL=/i.test(url) || /^DIRECT_URL=/i.test(url)) {
    issues.push(`${name} looks like a .env line — paste only the URI, not "DATABASE_URL="`)
  }
  if (/\s/.test(url)) {
    issues.push(`${name} contains whitespace (newline or spaces)`)
  }
  return { ok: issues.length === 0, url, issues }
}

async function probe(name, raw, applyPoolParams) {
  const format = validateFormat(name, raw)
  console.log(`\n=== ${name} ===`)
  if (!format.ok) {
    for (const i of format.issues) console.error('  ✗', i)
    return false
  }
  if (warnIfEmptyPassword(format.url, name)) return false
  let url = format.url
  if (applyPoolParams) url = applyServerlessParams(url)
  console.log('  format OK')
  console.log('  redacted:', redactUrl(url))
  const port = url.match(/:(\d+)\//)?.[1] ?? '?'
  console.log('  port:', port, port === '6543' ? '(transaction pool — good for Vercel)' : port === '5432' ? '(session/direct — use for DIRECT_URL / migrate)' : '')
  const ref = projectRefFromUrl(url)
  if (ref) console.log('  project ref:', ref)
  if (/db\.[a-z0-9]+\.supabase\.co/i.test(url) && port === '6543') {
    console.log(
      '  hint: db.*.supabase.co:6543 often fails — use Supabase Connect → Transaction pooler (*.pooler.supabase.com:6543, user postgres.<ref>)',
    )
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const rows = await prisma.$queryRaw`SELECT 1 AS ok`
    console.log('  connection OK', rows)
    return true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('  ✗ connection failed:')
    for (const line of msg.split('\n').filter(Boolean).slice(0, 8)) {
      console.error('    ', line.trim())
    }
    return false
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

loadDotEnv()
const checkDirect = process.argv.includes('--direct')

const dbRaw = process.env.DATABASE_URL
const directRaw = process.env.DIRECT_URL
const dbRef = dbRaw ? projectRefFromUrl(normalizeUrl(dbRaw)) : null
const directRef = directRaw ? projectRefFromUrl(normalizeUrl(directRaw)) : null
if (dbRef && directRef && dbRef !== directRef) {
  console.error(
    `\n⚠ DATABASE_URL project (${dbRef}) ≠ DIRECT_URL project (${directRef}) — use one Supabase project for both.\n`,
  )
}

const dbOk = await probe('DATABASE_URL', dbRaw, true)
let directOk = true
if (checkDirect || directRaw) {
  directOk = await probe('DIRECT_URL', directRaw, false)
} else {
  console.log('\n=== DIRECT_URL ===')
  console.log('  (skipped — add DIRECT_URL to .env or run with --direct)')
}

console.log('\n--- summary ---')
console.log('DATABASE_URL:', dbOk ? 'OK' : 'FAIL')
if (checkDirect || process.env.DIRECT_URL) {
  console.log('DIRECT_URL:', directOk ? 'OK' : 'FAIL')
}
process.exit(dbOk && directOk ? 0 : 1)
