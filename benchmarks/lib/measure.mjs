/**
 * Timing helpers: separate setup from the timed region; aggregation for noisy hosts.
 */

const injectRatio = Number(process.env.THEMEON_BENCH_INJECT_RATIO ?? '1')

export function benchInjectMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return ms
  return ms * (Number.isFinite(injectRatio) && injectRatio > 0 ? injectRatio : 1)
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

export function timeSync(fn) {
  const start = performance.now()
  const result = fn()
  return { result, ms: benchInjectMs(performance.now() - start) }
}

export async function timeAsync(fn) {
  const start = performance.now()
  const result = await fn()
  return { result, ms: benchInjectMs(performance.now() - start) }
}

export function warmMedianSync(fn, iterations) {
  const samples = []
  for (let i = 0; i < iterations; i++) {
    samples.push(timeSync(fn).ms)
  }
  return median(samples)
}
