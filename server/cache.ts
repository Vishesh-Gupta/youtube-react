/**
 * Remembers results for a while, keeping the most recently used, and shares one
 * request between callers asking for the same thing at once. Failed lookups are
 * not kept, so the next caller tries again.
 */
export class ResultCache<T> {
  private readonly entries = new Map<string, { value: Promise<T>; expires: number }>()
  private readonly maxEntries: number
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(maxEntries: number, ttlMs: number, now: () => number = Date.now) {
    this.maxEntries = maxEntries
    this.ttlMs = ttlMs
    this.now = now
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key)
    if (hit && hit.expires > this.now()) {
      // Move to the end: Maps iterate in insertion order, so the front is least recent.
      this.entries.delete(key)
      this.entries.set(key, hit)
      return hit.value
    }
    const value = load()
    this.entries.set(key, { value, expires: this.now() + this.ttlMs })
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key)
    })
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!)
    }
    return value
  }

  get size() {
    return this.entries.size
  }
}
