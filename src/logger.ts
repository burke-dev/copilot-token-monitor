import * as vscode from "vscode";

export interface LogEntry {
  timestamp: number;
  level: "info" | "warning" | "error";
  message: string;
  data?: any;
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logHistory: LogEntry[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      "Copilot Token Monitor",
    );
  }

  private log(
    level: "info" | "warning" | "error",
    message: string,
    data?: any,
  ): void {
    const timestamp = Date.now();
    const entry: LogEntry = { timestamp, level, message, data };

    this.logHistory.push(entry);

    // Keep history manageable
    if (this.logHistory.length > this.MAX_HISTORY) {
      this.logHistory.shift();
    }

    // Format timestamp
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString();

    // Output to channel
    const levelStr = level.toUpperCase().padEnd(7);
    const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
    this.outputChannel.appendLine(
      `[${timeStr}] ${levelStr} ${message}${dataStr}`,
    );
  }

  public info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  public warning(message: string, data?: any): void {
    this.log("warning", message, data);
  }

  public error(message: string, data?: any): void {
    this.log("error", message, data);
  }

  /**
   * Log a rate limit hit with detailed information
   */
  public logRateLimit(metrics: {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    timeWindow: string;
  }): void {
    this.error("⚠️ RATE LIMIT DETECTED", metrics);
    vscode.window.showWarningMessage(
      `Rate limit detected! Avg: ${metrics.avgTokensPerMinute.toFixed(1)} tokens/min. Check Output → Copilot Token Monitor for details.`,
    );
  }

  /**
   * Get all log entries
   */
  public getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Export logs to a string
   */
  public exportLogs(): string {
    return this.logHistory
      .map((entry) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toISOString();
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";
        return `[${timeStr}] ${entry.level.toUpperCase()} ${entry.message}${dataStr}`;
      })
      .join("\n");
  }

  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
