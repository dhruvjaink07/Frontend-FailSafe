import { config } from "@/lib/config/config"

export interface PollingManagerOptions {
  intervalMs?: number
  hiddenIntervalMs?: number
  maxBackoffMs?: number
  onTick: () => Promise<boolean | void> | boolean | void
  onStateChange?: (state: "active" | "paused" | "disconnected" | "stale") => void
}

export class Poller {
  private intervalMs: number
  private hiddenIntervalMs: number
  private maxBackoffMs: number
  private timer: ReturnType<typeof setTimeout> | null = null
  private stopped = true
  private failures = 0
  private lastSuccessAt = 0

  constructor(private readonly options: PollingManagerOptions) {
    this.intervalMs = options.intervalMs ?? config.POLL_ACTIVE_MS
    this.hiddenIntervalMs = options.hiddenIntervalMs ?? config.POLL_HIDDEN_MS
    this.maxBackoffMs = options.maxBackoffMs ?? 30000
    this.handleVisibility = this.handleVisibility.bind(this)
    this.handleOnline = this.handleOnline.bind(this)
    this.handleOffline = this.handleOffline.bind(this)
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    document.addEventListener("visibilitychange", this.handleVisibility)
    window.addEventListener("online", this.handleOnline)
    window.addEventListener("offline", this.handleOffline)
    this.tick(0)
  }

  stop(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    document.removeEventListener("visibilitychange", this.handleVisibility)
    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)
  }

  resume(): void {
    if (this.stopped) this.start()
    this.failures = 0
    this.options.onStateChange?.("active")
  }

  backoff(): number {
    const delay = Math.min(this.intervalMs * 2 ** this.failures, this.maxBackoffMs)
    return delay
  }

  private handleVisibility(): void {
    if (document.visibilityState === "hidden") {
      this.options.onStateChange?.("paused")
    } else {
      this.resume()
    }
  }

  private handleOnline(): void {
    this.resume()
  }

  private handleOffline(): void {
    this.options.onStateChange?.("disconnected")
  }

  private async tick(delay: number): Promise<void> {
    if (this.stopped) return
    this.timer = setTimeout(async () => {
      if (this.stopped) return

      if (document.visibilityState === "hidden") {
        this.tick(this.hiddenIntervalMs)
        return
      }

      try {
        const shouldContinue = await this.options.onTick()
        this.failures = 0
        this.lastSuccessAt = Date.now()
        this.options.onStateChange?.("active")
        if (shouldContinue === false) {
          this.stop()
          return
        }
        this.tick(this.intervalMs)
      } catch {
        this.failures += 1
        const staleMs = Date.now() - this.lastSuccessAt
        if (staleMs > this.intervalMs * 3) {
          this.options.onStateChange?.("stale")
        }
        this.tick(this.backoff())
      }
    }, delay)
  }
}
