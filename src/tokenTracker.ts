import * as vscode from "vscode";
import { Logger } from "./logger";

interface TokenUsageEntry {
  timestamp: number;
  tokens: number;
  requestId: string;
}

export class TokenTracker {
  private readonly TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  private usageHistory: TokenUsageEntry[] = [];
  private readonly storageKey = "copilotTokenUsageHistory";
  private lastRateLimitWarning: number = 0;
  private readonly RATE_LIMIT_WARNING_COOLDOWN = 5 * 60 * 1000; // 5 minutes between warnings

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
  ) {
    this.loadHistory();
    this.startCleanupTimer();
    this.logger.info("TokenTracker initialized");
  }

  /**
   * Load token usage history from persistent storage
   */
  private async loadHistory(): Promise<void> {
    const stored = this.context.globalState.get<TokenUsageEntry[]>(
      this.storageKey,
    );
    if (stored) {
      this.usageHistory = stored;
      this.cleanOldEntries();
    }
  }

  /**
   * Save token usage history to persistent storage
   */
  private async saveHistory(): Promise<void> {
    await this.context.globalState.update(this.storageKey, this.usageHistory);
  }

  /**
   * Record a new token usage event
   */
  public async recordUsage(
    tokens: number,
    requestId: string = "",
  ): Promise<void> {
    const entry: TokenUsageEntry = {
      timestamp: Date.now(),
      tokens,
      requestId,
    };

    this.usageHistory.push(entry);
    this.cleanOldEntries();
    await this.saveHistory();

    // Log the usage
    this.logger.info("Token usage recorded", {
      tokens,
      requestId,
      totalTokens: this.getTotalTokens(),
      avgTokensPerMin: this.getAverageTokensPerMinute(),
    });

    // Check if we might be hitting rate limits
    this.checkForRateLimit();
  }

  /**
   * Remove entries older than 2 hours
   */
  private cleanOldEntries(): void {
    const cutoff = Date.now() - this.TWO_HOURS_MS;
    this.usageHistory = this.usageHistory.filter(
      (entry) => entry.timestamp >= cutoff,
    );
  }

  /**
   * Start a timer to periodically clean old entries
   */
  private startCleanupTimer(): void {
    setInterval(
      () => {
        this.cleanOldEntries();
        this.saveHistory();
      },
      5 * 60 * 1000,
    ); // Clean every 5 minutes
  }

  /**
   * Get total tokens used in the 2-hour window
   */
  public getTotalTokens(): number {
    return this.usageHistory.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /**
   * Get number of requests in the 2-hour window
   */
  public getRequestCount(): number {
    return this.usageHistory.length;
  }

  /**
   * Get average tokens per minute
   */
  public getAverageTokensPerMinute(): number {
    if (this.usageHistory.length === 0) {
      return 0;
    }

    const totalTokens = this.getTotalTokens();
    const oldestTimestamp = Math.min(
      ...this.usageHistory.map((e) => e.timestamp),
    );
    const timeSpanMinutes = (Date.now() - oldestTimestamp) / (60 * 1000);

    return timeSpanMinutes > 0 ? totalTokens / timeSpanMinutes : totalTokens;
  }

  /**
   * Get usage level (0-1 scale) for visual indicator
   * Uses a simple heuristic: higher recent usage = lower available capacity
   */
  public getUsageLevel(): number {
    const tokensPerMinute = this.getAverageTokensPerMinute();

    // Heuristic: assume 1000 tokens/min is "high" usage
    // This can be adjusted based on actual rate limits
    const maxRate = 1000;
    const level = Math.min(tokensPerMinute / maxRate, 1.0);

    return level;
  }

  /**
   * Get usage metrics for display
   */
  public getMetrics(): {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    usageLevel: number;
    status: "low" | "medium" | "high";
  } {
    const level = this.getUsageLevel();
    let status: "low" | "medium" | "high";

    if (level < 0.3) {
      status = "low";
    } else if (level < 0.7) {
      status = "medium";
    } else {
      status = "high";
    }

    return {
      totalTokens: this.getTotalTokens(),
      requestCount: this.getRequestCount(),
      avgTokensPerMinute:
        Math.round(this.getAverageTokensPerMinute() * 10) / 10,
      usageLevel: Math.round(level * 100) / 100,
      status,
    };
  }

  /**
   * Clear all usage history
   */
  public async clearHistory(): Promise<void> {
    this.usageHistory = [];
    await this.saveHistory();
    this.logger.info("Usage history cleared");
  }

  /**
   * Check if current usage patterns suggest we might hit rate limits
   */
  private checkForRateLimit(): void {
    const metrics = this.getMetrics();

    // If we're in high usage territory and haven't warned recently
    if (metrics.status === "high") {
      const now = Date.now();
      if (now - this.lastRateLimitWarning > this.RATE_LIMIT_WARNING_COOLDOWN) {
        this.logger.warning(
          "High token usage detected - approaching potential rate limit",
          {
            totalTokens: metrics.totalTokens,
            requestCount: metrics.requestCount,
            avgTokensPerMinute: metrics.avgTokensPerMinute,
            usageLevel: metrics.usageLevel,
          },
        );
        this.lastRateLimitWarning = now;
      }
    }
  }

  /**
   * Record when an actual rate limit error occurs
   * Call this method when you detect a rate limit error from the API
   */
  public recordRateLimitHit(errorDetails?: any): void {
    const metrics = this.getMetrics();

    this.logger.logRateLimit({
      totalTokens: metrics.totalTokens,
      requestCount: metrics.requestCount,
      avgTokensPerMinute: metrics.avgTokensPerMinute,
      timeWindow: "2 hours",
    });

    if (errorDetails) {
      this.logger.error("Rate limit error details", errorDetails);
    }
  }
}
