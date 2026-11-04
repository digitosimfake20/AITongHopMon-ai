/**
 * Load-test configuration: env + CLI, safety caps, production gate.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_BASE_URL = 'https://aitonghopmon-ai.vercel.app'

const DEFAULT_OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'results')

/** Hard safety caps — raise only with intentional profile + confirm. */
export const HARD_CAPS = Object.freeze({
  maxVus: 50,
  maxDurationSec: 600,
  maxRampSec: 120,
  maxRequestsPerVu: 10_000,
  requestTimeoutMs: 60_000,
})

export const PROFILES = Object.freeze({
  dry: {
    description: 'Local smoke: 1 VU, 5s, public only — no sustained load',
    vus: 1,
    durationSec: 5,
    rampSec: 0,
    thinkMs: 0,
    scenario: 'public',
    rsc: false,
  },
  modest: {
    description: 'Default sustained profile: light concurrency on public + optional auth',
    vus: 5,
    durationSec: 30,
    rampSec: 5,
    thinkMs: 200,
    scenario: 'mix',
    rsc: true,
  },
  aggressive: {
    description: 'Heavier soak — still capped; requires LOADTEST_CONFIRM_PROD=1 on default host',
    vus: 20,
    durationSec: 120,
    rampSec: 15,
    thinkMs: 50,
    scenario: 'mix',
    rsc: true,
  },
})

const PROD_HOST_HINTS = ['aitonghopmon-ai.vercel.app', 'vercel.app']

export function isProductionLikeHost(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase()
    return PROD_HOST_HINTS.some((h) => host === h || host.endsWith(`.${h}`) || host.endsWith(h))
  } catch {
    return false
  }
}

function parseDuration(raw, fallbackSec) {
  if (raw == null || raw === '') return fallbackSec
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw))
  const s = String(raw).trim()
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i.exec(s)
  if (!m) {
    const n = Number(s)
    if (!Number.isFinite(n)) throw new Error(`Invalid duration: ${raw}`)
    return Math.max(0, Math.floor(n))
  }
  const n = Number(m[1])
  const unit = (m[2] || 's').toLowerCase()
  if (unit === 'ms') return Math.max(0, Math.floor(n / 1000))
  if (unit === 's') return Math.max(0, Math.floor(n))
  if (unit === 'm') return Math.max(0, Math.floor(n * 60))
  if (unit === 'h') return Math.max(0, Math.floor(n * 3600))
  return Math.max(0, Math.floor(n))
}

function parseIntArg(raw, fallback) {
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid number: ${raw}`)
  return Math.floor(n)
}

function parseBool(raw, fallback = false) {
  if (raw == null || raw === '') return fallback
  const s = String(raw).toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off'].includes(s)) return false
  return fallback
}

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next == null || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    } else {
      args._.push(a)
    }
  }
  return args
}

/**
 * Resolve final run config from env + CLI.
 * @param {string[]} argv process.argv.slice(2)
 */
export function resolveConfig(argv = []) {
  const args = parseArgs(argv)
  const profileName = String(args.profile || process.env.LOADTEST_PROFILE || 'modest')
  const profile = PROFILES[profileName]
  if (!profile && profileName !== 'custom') {
    throw new Error(
      `Unknown profile "${profileName}". Use: ${Object.keys(PROFILES).join(', ')}`,
    )
  }
  const base = profile || PROFILES.modest

  const baseUrl = String(
    args['base-url'] || process.env.BASE_URL || DEFAULT_BASE_URL,
  ).replace(/\/$/, '')

  const dryRun = Boolean(args['dry-run']) || parseBool(process.env.DRY_RUN) || profileName === 'dry'
  const confirmProd =
    parseBool(process.env.LOADTEST_CONFIRM_PROD) || Boolean(args['confirm-prod'])

  let vus = parseIntArg(args.vus ?? process.env.LOADTEST_VUS, base.vus)
  let durationSec = parseDuration(
    args.duration ?? process.env.LOADTEST_DURATION,
    base.durationSec,
  )
  let rampSec = parseDuration(args.ramp ?? process.env.LOADTEST_RAMP, base.rampSec)
  let thinkMs = parseIntArg(args['think-ms'] ?? process.env.LOADTEST_THINK_MS, base.thinkMs)

  if (dryRun) {
    vus = Math.min(vus, 1)
    durationSec = Math.min(durationSec, 5)
    rampSec = 0
  }

  if (vus > HARD_CAPS.maxVus) {
    throw new Error(`VUs ${vus} exceeds hard cap ${HARD_CAPS.maxVus}`)
  }
  if (durationSec > HARD_CAPS.maxDurationSec) {
    throw new Error(`Duration ${durationSec}s exceeds hard cap ${HARD_CAPS.maxDurationSec}s`)
  }
  if (rampSec > HARD_CAPS.maxRampSec) {
    throw new Error(`Ramp ${rampSec}s exceeds hard cap ${HARD_CAPS.maxRampSec}s`)
  }

  const scenario = String(args.scenario || process.env.LOADTEST_SCENARIO || base.scenario)
  const rsc =
    args.rsc === true || args.rsc === 'true'
      ? true
      : args.rsc === false || args.rsc === 'false'
        ? false
        : parseBool(process.env.LOADTEST_RSC, base.rsc)

  const cookie =
    process.env.LOADTEST_COOKIE ||
    process.env.AUTH_COOKIE ||
    process.env.LOADTEST_SESSION_COOKIE ||
    ''
  const bearer = process.env.LOADTEST_BEARER || process.env.AUTH_BEARER || ''
  const classId = process.env.LOADTEST_CLASS_ID || args['class-id'] || ''

  const outDir = String(args['out-dir'] || process.env.LOADTEST_OUT_DIR || DEFAULT_OUT_DIR)

  const help = Boolean(args.help || args.h)

  return {
    profileName: profile ? profileName : 'custom',
    profileDescription: profile?.description ?? 'Custom overrides',
    baseUrl,
    vus,
    durationSec,
    rampSec,
    thinkMs,
    scenario,
    rsc,
    dryRun,
    confirmProd,
    cookie: cookie.trim(),
    bearer: bearer.trim(),
    classId: String(classId).trim(),
    outDir,
    help,
    timeoutMs: HARD_CAPS.requestTimeoutMs,
  }
}

/**
 * Enforce production confirmation gate. Throws if blocked.
 */
export function assertSafetyGate(config) {
  if (!isProductionLikeHost(config.baseUrl)) return

  console.warn(
    [
      '',
      '⚠  TARGET LOOKS LIKE PRODUCTION / Vercel hosting.',
      '   Sustained load can cost money, trip rate limits, and affect real users.',
      '   Only hit BASE_URL for this app — never third parties.',
      '',
    ].join('\n'),
  )

  if (config.dryRun) return

  const needsConfirm =
    config.profileName === 'aggressive' ||
    config.vus >= 10 ||
    config.durationSec >= 60 ||
    isProductionLikeHost(config.baseUrl)

  // Always require confirm for the default production host unless dry-run
  if (needsConfirm && !config.confirmProd) {
    throw new Error(
      [
        'Blocked: production-like BASE_URL requires LOADTEST_CONFIRM_PROD=1 (or --confirm-prod).',
        'Use --profile dry or DRY_RUN=1 for a short smoke without the gate.',
        `BASE_URL=${config.baseUrl}`,
      ].join(' '),
    )
  }
}
