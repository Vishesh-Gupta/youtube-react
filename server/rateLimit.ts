/**
 * At most `limit` requests per client in any `windowMs`, so one visitor can't
 * spend the whole day's API quota.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>()
  private readonly limit: number
  private readonly windowMs: number
  private readonly now: () => number

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit
    this.windowMs = windowMs
    this.now = now
  }

  /** Records a request; false when the client is over the limit. */
  allow(client: string): boolean {
    const now = this.now()
    const recent = (this.hits.get(client) ?? []).filter((t) => t > now - this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(client, recent)
      return false
    }
    recent.push(now)
    this.hits.set(client, recent)
    // Forget idle clients now and then so the map doesn't grow without bound.
    if (this.hits.size > 10_000) {
      for (const [key, times] of this.hits)
        if (!times.some((t) => t > now - this.windowMs)) this.hits.delete(key)
    }
    return true
  }
}
