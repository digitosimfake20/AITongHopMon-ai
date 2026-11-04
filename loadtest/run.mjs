#!/usr/bin/env node
/**
 * Mathz load-test entrypoint (Node 20+ native fetch).
 *
 * Why Node instead of k6/Artillery?
 * - Neither binary is in this environment; Node is already required by the app.
 * - Zero extra install for a smoke/modest run; isolated under loadtest/.
 * - Clear VU concurrency, ramp, think-time, and JSON results without a DSL.
 *
 * Usage:
 *   node loadtest/run.mjs --profile dry
 *   LOADTEST_CONFIRM_PROD=1 node loadtest/run.mjs --profile modest
 *   BASE_URL=http://localhost:3000 node loadtest/run.mjs --profile modest --scenario public
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PROFILES,
  HARD_CAPS,
  DEFAULT_BASE_URL,
  resolveConfig,
  assertSafetyGate,
} from './lib/config.mjs'
import { formatSummaryTable } from './lib/metrics.mjs'
import { runLoadTest } from './lib/runner.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function printHelp() {
  console.log(`Mathz load-test harness

Usage:
  node loadtest/run.mjs [options]

Profiles:
${Object.entries(PROFILES)
  .map(([k, v]) => `  ${k.padEnd(12)} vus=${v.vus} duration=${v.durationSec}s ramp=${v.rampSec}s think=${v.thinkMs}ms scenario=${v.scenario}\n               ${v.description}`)
  .join('\n')}

Options:
  --profile <name>     dry | modest | aggressive (default: modest)
  --base-url <url>     Target origin (default: ${DEFAULT_BASE_URL} or BASE_URL)
  --vus <n>            Concurrent virtual users (cap ${HARD_CAPS.maxVus})
  --duration <t>       e.g. 30, 30s, 2m (cap ${HARD_CAPS.maxDurationSec}s)
  --ramp <t>           Linear VU ramp-up
  --think-ms <n>       Pause between requests per VU
  --scenario <name>    public | student | teacher | mix | hot
  --rsc / --rsc false  Also probe ?_rsc=1 soft-nav style GETs
  --class-id <uuid>    Append ?class= for dashboard/teacher routes
  --dry-run            One request per target; skips prod confirm
  --confirm-prod       Same as LOADTEST_CONFIRM_PROD=1
  --out-dir <path>     Results directory (default: loadtest/results)
  -h, --help           This help

Env:
  BASE_URL, LOADTEST_PROFILE, LOADTEST_VUS, LOADTEST_DURATION, LOADTEST_RAMP,
  LOADTEST_THINK_MS, LOADTEST_SCENARIO, LOADTEST_RSC, LOADTEST_CLASS_ID,
  LOADTEST_COOKIE / AUTH_COOKIE, LOADTEST_BEARER, LOADTEST_CONFIRM_PROD,
  DRY_RUN, LOADTEST_VERBOSE

Safety:
  Production-like hosts require LOADTEST_CONFIRM_PROD=1 unless --dry-run / --profile dry.
  Hard caps: ${HARD_CAPS.maxVus} VUs, ${HARD_CAPS.maxDurationSec}s duration.
  Do not point BASE_URL at third parties.

Auth cookie capture (never commit):
  1. Sign in as student or teacher in the browser.
  2. DevTools → Application → Cookies → copy Cookie header values for the host
     (Supabase sb-* / *-auth-token cookies), or Network → any document → Request Headers → Cookie.
  3. export LOADTEST_COOKIE='name=value; name2=value2'
  4. Optionally export LOADTEST_CLASS_ID=<classroom uuid>
`)
}

async function main() {
  const config = resolveConfig(process.argv.slice(2))
  if (config.help) {
    printHelp()
    process.exit(0)
  }

  assertSafetyGate(config)

  const result = await runLoadTest(config)
  const summary = result.metrics

  console.log('\n=== Summary ===')
  console.log(formatSummaryTable(summary))

  await mkdir(config.outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outFile = path.join(
    config.outDir,
    `result-${config.profileName}-${stamp}.json`,
  )
  const latest = path.join(config.outDir, 'latest.json')

  const payload = {
    tool: 'node-loadtest',
    why: 'Node native fetch — no k6/Artillery install required; isolated under loadtest/',
    config: {
      ...config,
      cookie: config.cookie ? '[redacted]' : '',
      bearer: config.bearer ? '[redacted]' : '',
    },
    summary,
  }

  await writeFile(outFile, JSON.stringify(payload, null, 2))
  await writeFile(latest, JSON.stringify(payload, null, 2))
  console.log(`\nWrote ${path.relative(path.join(__dirname, '..'), outFile)}`)
  console.log(`Wrote ${path.relative(path.join(__dirname, '..'), latest)}`)

  if (summary.errorRate > 0.5 && summary.requests >= 5) {
    console.error('\nHigh error rate — check BASE_URL, auth cookies, or rate limits.')
    process.exitCode = 2
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
