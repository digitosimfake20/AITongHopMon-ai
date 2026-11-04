/**
 * Concurrent VU runner with optional linear ramp and think-time.
 */

import { createMetrics } from './metrics.mjs'
import { buildPool, pickTarget, buildRequest } from './scenarios.mjs'
import { HARD_CAPS } from './config.mjs'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {import('./config.mjs').resolveConfig extends Function ? any : never} config
 */
export async function runLoadTest(config) {
  const hasAuth = Boolean(config.cookie || config.bearer)
  const pool = buildPool({
    scenario: config.scenario,
    rsc: config.rsc,
    hasAuth,
    classId: config.classId,
  })

  if (!pool.length) {
    throw new Error('Empty request pool — check scenario / auth env')
  }

  const metrics = createMetrics()
  const endAt = Date.now() + config.durationSec * 1000
  const abort = { stopped: false }

  console.log(
    [
      `baseUrl=${config.baseUrl}`,
      `profile=${config.profileName}`,
      `scenario=${config.scenario}`,
      `vus=${config.vus}`,
      `duration=${config.durationSec}s`,
      `ramp=${config.rampSec}s`,
      `thinkMs=${config.thinkMs}`,
      `rsc=${config.rsc}`,
      `auth=${hasAuth ? 'yes' : 'no'}`,
      `dryRun=${config.dryRun}`,
      `targets=${pool.length}`,
    ].join('  '),
  )

  if (config.dryRun) {
    console.log('DRY RUN: issuing one request per unique target name, then exiting.')
    const seen = new Set()
    for (const t of pool) {
      if (seen.has(t.name)) continue
      seen.add(t.name)
      await oneRequest(config, t, metrics)
    }
    metrics.finish()
    return { metrics: metrics.summary(), poolSize: pool.length, dryRun: true }
  }

  /** @type {Promise<void>[]} */
  const workers = []
  for (let i = 0; i < config.vus; i++) {
    const delay =
      config.rampSec > 0 ? Math.floor((config.rampSec * 1000 * i) / Math.max(config.vus - 1, 1)) : 0
    workers.push(vuLoop(i, delay, endAt, abort, config, pool, metrics))
  }

  await Promise.all(workers)
  metrics.finish()
  return { metrics: metrics.summary(), poolSize: pool.length, dryRun: false }
}

async function vuLoop(id, startDelay, endAt, abort, config, pool, metrics) {
  if (startDelay) await sleep(startDelay)
  let n = 0
  while (!abort.stopped && Date.now() < endAt) {
    if (n >= HARD_CAPS.maxRequestsPerVu) break
    const target = pickTarget(pool)
    await oneRequest(config, target, metrics)
    n++
    if (config.thinkMs > 0) await sleep(config.thinkMs)
  }
}

async function oneRequest(config, target, metrics) {
  const { url, headers, name } = buildRequest(config, target)
  const t0 = performance.now()
  let success = false
  let status = 0
  let errMsg = ''
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), config.timeoutMs)
    const res = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: ac.signal,
    })
    clearTimeout(timer)
    status = res.status
    // Consume body so connections close cleanly (don't buffer huge pages forever)
    await res.arrayBuffer().catch(() => {})
    // 2xx/3xx count as transport OK for page GETs (auth redirects are expected without cookie)
    success = status >= 200 && status < 400
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err)
    success = false
  }
  const ms = performance.now() - t0
  metrics.record(name, ms, success)
  if (!success && process.env.LOADTEST_VERBOSE) {
    console.warn(`fail ${name} status=${status} ${errMsg} ${Math.round(ms)}ms`)
  }
}
