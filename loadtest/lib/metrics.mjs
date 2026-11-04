/**
 * Latency histogram + summary (RPS, p50/p95/p99, error rate).
 */

export function createMetrics() {
  /** @type {number[]} */
  const latenciesMs = []
  let ok = 0
  let fail = 0
  /** @type {Record<string, { ok: number, fail: number, latencies: number[] }>} */
  const byName = Object.create(null)
  const startedAt = Date.now()
  let finishedAt = startedAt

  function bucket(name) {
    if (!byName[name]) byName[name] = { ok: 0, fail: 0, latencies: [] }
    return byName[name]
  }

  return {
    record(name, ms, success) {
      latenciesMs.push(ms)
      const b = bucket(name)
      b.latencies.push(ms)
      if (success) {
        ok++
        b.ok++
      } else {
        fail++
        b.fail++
      }
    },
    finish() {
      finishedAt = Date.now()
    },
    summary() {
      const elapsedSec = Math.max((finishedAt - startedAt) / 1000, 0.001)
      const total = ok + fail
      return {
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        elapsedSec: round(elapsedSec, 3),
        requests: total,
        ok,
        fail,
        errorRate: total === 0 ? 0 : round(fail / total, 4),
        rps: round(total / elapsedSec, 2),
        latencyMs: percentiles(latenciesMs),
        byScenario: Object.fromEntries(
          Object.entries(byName).map(([name, b]) => {
            const t = b.ok + b.fail
            return [
              name,
              {
                requests: t,
                ok: b.ok,
                fail: b.fail,
                errorRate: t === 0 ? 0 : round(b.fail / t, 4),
                latencyMs: percentiles(b.latencies),
              },
            ]
          }),
        ),
      }
    },
  }
}

function round(n, d) {
  const p = 10 ** d
  return Math.round(n * p) / p
}

/**
 * @param {number[]} samples
 */
export function percentiles(samples) {
  if (!samples.length) {
    return { p50: null, p95: null, p99: null, min: null, max: null, mean: null }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  return {
    p50: round(pct(sorted, 0.5), 2),
    p95: round(pct(sorted, 0.95), 2),
    p99: round(pct(sorted, 0.99), 2),
    min: round(sorted[0], 2),
    max: round(sorted[sorted.length - 1], 2),
    mean: round(mean, 2),
  }
}

function pct(sorted, p) {
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const w = idx - lo
  return sorted[lo] * (1 - w) + sorted[hi] * w
}

export function formatSummaryTable(summary) {
  const L = summary.latencyMs
  const lines = [
    `elapsed=${summary.elapsedSec}s  requests=${summary.requests}  rps=${summary.rps}`,
    `ok=${summary.ok}  fail=${summary.fail}  errorRate=${(summary.errorRate * 100).toFixed(2)}%`,
    `latency ms  p50=${L.p50}  p95=${L.p95}  p99=${L.p99}  min=${L.min}  max=${L.max}  mean=${L.mean}`,
  ]
  for (const [name, s] of Object.entries(summary.byScenario)) {
    lines.push(
      `  [${name}] n=${s.requests} err=${(s.errorRate * 100).toFixed(1)}% p50=${s.latencyMs.p50} p95=${s.latencyMs.p95} p99=${s.latencyMs.p99}`,
    )
  }
  return lines.join('\n')
}
