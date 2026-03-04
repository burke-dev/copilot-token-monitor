import * as vscode from "vscode";
import { TokenTracker } from "./tokenTracker";

export interface DiagnosticStatus {
  active: boolean;
  currentTest: number;
  totalTests: number;
  currentAttempt: number;
}
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private diagnosticsButton: vscode.StatusBarItem;
  private updateInterval: NodeJS.Timeout | undefined;

  constructor(
    private tokenTracker: TokenTracker,
    private context: vscode.ExtensionContext,
  ) {
    // Create status bar item with unique ID
    this.statusBarItem = vscode.window.createStatusBarItem(
      "copilotTokenMonitor",
      vscode.StatusBarAlignment.Right,
      100,
    );

    this.statusBarItem.command = "copilot-token-monitor.showDetails";
    this.context.subscriptions.push(this.statusBarItem);

    this.diagnosticsButton = vscode.window.createStatusBarItem(
      "copilotTokenMonitorDiagnostics",
      vscode.StatusBarAlignment.Right,
      101,
    );
    this.diagnosticsButton.text = "$(beaker) Calibrate";
    this.diagnosticsButton.tooltip = "Start diagnostic calibration";
    this.diagnosticsButton.command = "copilot-token-monitor.startDiagnostics";
    this.diagnosticsButton.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    );
    this.context.subscriptions.push(this.diagnosticsButton);

    this.update();
    this.statusBarItem.show();
    this.diagnosticsButton.show();

    // Update every 10 seconds
    this.startUpdateTimer();
  }

  /**
   * Update the status bar display
   */
  public update(): void {
    const metrics = this.tokenTracker.getMetrics();

    if (this.diagnosticStatus?.active) {
      this.updateDiagnostic(metrics);
      this.updateDiagnosticsButton(true);
      return;
    }

    this.updateDiagnosticsButton(false);

    // Create progress bar visualization
    const progressBar = this.createProgressBar(metrics.usageLevel);

    // Set text with color coding
    const icon = this.getStatusIcon(metrics.status);
    this.statusBarItem.text = `${icon} ${progressBar}`;

    // Set tooltip with detailed metrics
    this.statusBarItem.tooltip = this.createTooltip(metrics);

    // Set background color based on usage level
    this.statusBarItem.backgroundColor = this.getBackgroundColor(
      metrics.status,
    );
  }

  /**
   * Create a visual progress bar using Unicode characters
   */
  private createProgressBar(level: number): string {
    const barLength = 10;
    const filledBlocks = Math.round(level * barLength);

    // Unicode box drawing characters for smooth progress bar
    const filled = "█";
    const empty = "░";

    const bar =
      filled.repeat(filledBlocks) + empty.repeat(barLength - filledBlocks);
    return bar;
  }

  /**
   * Get status icon based on usage level
   */
  private getStatusIcon(status: "low" | "medium" | "high"): string {
    switch (status) {
      case "low":
        return "$(check)"; // Available capacity
      case "medium":
        return "$(warning)"; // Moderate usage
      case "high":
        return "$(error)"; // High usage, risk of rate limit
    }
  }

  /**
   * Get background color for status bar item
   */
  private getBackgroundColor(
    status: "low" | "medium" | "high",
  ): vscode.ThemeColor | undefined {
    switch (status) {
      case "high":
        return new vscode.ThemeColor("statusBarItem.errorBackground");
      case "medium":
        return new vscode.ThemeColor("statusBarItem.warningBackground");
      default:
        return undefined; // Use default background
    }
  }

  /**
   * Create detailed tooltip with metrics
   */
  private createTooltip(metrics: {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    usageLevel: number;
    status: "low" | "medium" | "high";
  }): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    const statusText = this.getStatusText(metrics.status);

    tooltip.appendMarkdown(`### Copilot Token Monitor\n\n`);
    tooltip.appendMarkdown(`**Status:** ${statusText}\n\n`);
    tooltip.appendMarkdown(`**2-Hour Rolling Window:**\n`);
    tooltip.appendMarkdown(
      `- Total Tokens: ${metrics.totalTokens.toLocaleString()}\n`,
    );
    tooltip.appendMarkdown(`- Request Count: ${metrics.requestCount}\n`);
    tooltip.appendMarkdown(
      `- Avg Tokens/Min: ${metrics.avgTokensPerMinute.toFixed(1)}\n`,
    );
    tooltip.appendMarkdown(
      `- Usage Level: ${(metrics.usageLevel * 100).toFixed(0)}%\n\n`,
    );
    tooltip.appendMarkdown(`Click for detailed view`);

    return tooltip;
  }

  /**
   * Get human-readable status text
   */
  private getStatusText(status: "low" | "medium" | "high"): string {
    switch (status) {
      case "low":
        return "✓ Low Usage (Good)";
      case "medium":
        return "⚠ Moderate Usage";
      case "high":
        return "⚠ High Usage (Risk of Rate Limit)";
    }
  }

  /**
   * Start automatic update timer
   */
  private startUpdateTimer(): void {
    this.updateInterval = setInterval(() => {
      this.update();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.statusBarItem.dispose();
    this.diagnosticsButton.dispose();
  }

  private diagnosticStatus: DiagnosticStatus | undefined;

  public setDiagnosticStatus(status: DiagnosticStatus): void {
    this.diagnosticStatus = status;
    this.update();
  }

  private updateDiagnostic(metrics: {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    usageLevel: number;
    status: "low" | "medium" | "high";
  }): void {
    const progress = this.createDiagnosticProgress();
    this.statusBarItem.text = `$(beaker) DIAG ${progress}`;
    this.statusBarItem.tooltip = this.createDiagnosticTooltip(metrics);
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    );
  }

  private updateDiagnosticsButton(isActive: boolean): void {
    if (isActive) {
      this.diagnosticsButton.text = "$(beaker) Calibrating";
      this.diagnosticsButton.tooltip = "Stop diagnostic calibration";
      this.diagnosticsButton.command = "copilot-token-monitor.stopDiagnostics";
      this.diagnosticsButton.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
    } else {
      this.diagnosticsButton.text = "$(beaker) Calibrate";
      this.diagnosticsButton.tooltip = "Start diagnostic calibration";
      this.diagnosticsButton.command = "copilot-token-monitor.startDiagnostics";
      this.diagnosticsButton.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
  }

  private createDiagnosticProgress(): string {
    if (!this.diagnosticStatus) {
      return "0/0";
    }
    return `${this.diagnosticStatus.currentTest}/${this.diagnosticStatus.totalTests}`;
  }

  private createDiagnosticTooltip(metrics: {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    usageLevel: number;
    status: "low" | "medium" | "high";
  }): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    tooltip.appendMarkdown(`### Copilot Token Monitor - Diagnostic Mode\n\n`);
    tooltip.appendMarkdown(
      `**Test:** ${this.diagnosticStatus?.currentTest}/${this.diagnosticStatus?.totalTests} (Attempt ${this.diagnosticStatus?.currentAttempt})\n\n`,
    );
    tooltip.appendMarkdown(`**Status:** Calibration in progress\n\n`);
    tooltip.appendMarkdown(
      `Prompts are temporarily blocked during diagnostics.\n`,
    );
    tooltip.appendMarkdown(
      `Use **Copilot Token Monitor: Stop Diagnostics** to halt the run.\n\n`,
    );
    tooltip.appendMarkdown(`---\n`);
    tooltip.appendMarkdown(`**Current Usage Snapshot:**\n`);
    tooltip.appendMarkdown(
      `- Total Tokens: ${metrics.totalTokens.toLocaleString()}\n`,
    );
    tooltip.appendMarkdown(`- Request Count: ${metrics.requestCount}\n`);
    tooltip.appendMarkdown(
      `- Avg Tokens/Min: ${metrics.avgTokensPerMinute.toFixed(1)}\n`,
    );
    tooltip.appendMarkdown(
      `- Usage Level: ${(metrics.usageLevel * 100).toFixed(0)}%\n`,
    );

    return tooltip;
  }
}
