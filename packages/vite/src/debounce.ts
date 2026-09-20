/**
 * Trailing debounce that always flushes the last scheduled call (P3.3).
 * Concurrent awaiters share the same in-flight promise until the timer fires.
 */
export function createTrailingDebounce<T>(fn: () => Promise<T>, waitMs: number): () => Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight: Promise<T> | undefined

  return () => {
    if (timer !== undefined) clearTimeout(timer)
    inflight = new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        timer = undefined
        fn()
          .then(resolve, reject)
          .finally(() => {
            inflight = undefined
          })
      }, waitMs)
    })
    return inflight
  }
}
