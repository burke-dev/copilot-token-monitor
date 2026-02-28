import * as vscode from "vscode";
import { TokenTracker } from "./tokenTracker";
import { StatusBarManager } from "./statusBarManager";
import { Logger } from "./logger";

let tokenTracker: TokenTracker;
let statusBarManager: StatusBarManager;
let logger: Logger;

export function activate(context: vscode.ExtensionContext) {
  console.log("Copilot Token Monitor is now active!");

  // Initialize logger
  logger = new Logger();
  context.subscriptions.push(logger);
  logger.info("Extension activated");

  // Initialize token tracker
  tokenTracker = new TokenTracker(context, logger);

  // Initialize status bar manager
  statusBarManager = new StatusBarManager(tokenTracker, context);

  // Register command to show detailed metrics
  const showDetailsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.showDetails",
    () => {
      const metrics = tokenTracker.getMetrics();
      const message = `
**Copilot Token Usage (2-Hour Window)**

Total Tokens: ${metrics.totalTokens.toLocaleString()}
Request Count: ${metrics.requestCount}
Avg Tokens/Min: ${metrics.avgTokensPerMinute.toFixed(1)}
Usage Level: ${(metrics.usageLevel * 100).toFixed(0)}%
Status: ${metrics.status.toUpperCase()}

${getUsageTip(metrics.status)}
			`.trim();

      vscode.window.showInformationMessage(message, { modal: false });
    },
  );

  // Register command to manually record token usage (for testing)
  const recordUsageCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.recordUsage",
    async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Enter number of tokens to record",
        placeHolder: "1000",
        validateInput: (value) => {
          const num = parseInt(value);
          return isNaN(num) || num <= 0
            ? "Please enter a positive number"
            : null;
        },
      });

      if (input) {
        const tokens = parseInt(input);
        await tokenTracker.recordUsage(tokens, "manual-entry");
        statusBarManager.update();
        vscode.window.showInformationMessage(`Recorded ${tokens} tokens`);
      }
    },
  );

  // Register command to clear history
  const clearHistoryCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.clearHistory",
    async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Clear all token usage history?",
        { modal: true },
        "Clear",
      );

      if (confirm === "Clear") {
        await tokenTracker.clearHistory();
        statusBarManager.update();
        vscode.window.showInformationMessage("Token usage history cleared");
      }
    },
  );

  // Register command to show logs
  const showLogsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.showLogs",
    () => {
      logger.show();
    },
  );

  // Register command to export logs
  const exportLogsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.exportLogs",
    async () => {
      const logs = logger.exportLogs();
      const doc = await vscode.workspace.openTextDocument({
        content: logs,
        language: "log",
      });
      await vscode.window.showTextDocument(doc);
      logger.info("Logs exported to new document");
    },
  );

  // Listen to Copilot chat events if available
  // Note: The Copilot API is still evolving, so we use telemetry as a fallback
  try {
    const logger = vscode.env.createTelemetryLogger({
      sendEventData(eventName, data) {
        // Intercept telemetry to estimate token usage
        if (eventName.includes("chat") || eventName.includes("copilot")) {
          // Rough estimation: average chat request ~500 tokens
          tokenTracker.recordUsage(500, eventName);
          statusBarManager.update();
        }
      },
      sendErrorData(error, data) {
        // Check if this is a rate limit error
        const errorStr = error?.toString().toLowerCase() || "";
        if (
          errorStr.includes("rate limit") ||
          errorStr.includes("429") ||
          errorStr.includes("too many requests")
        ) {
          tokenTracker.recordRateLimitHit({ error: error?.toString(), data });
        }
      },
    });

    context.subscriptions.push(logger);
  } catch (error) {
    console.log("Telemetry logger not available:", error);
  }

  context.subscriptions.push(
    showDetailsCommand,
    recordUsageCommand,
    clearHistoryCommand,
    showLogsCommand,
    exportLogsCommand,
  );
}

function getUsageTip(status: "low" | "medium" | "high"): string {
  switch (status) {
    case "low":
      return "✓ You have plenty of capacity available";
    case "medium":
      return "⚠ Consider pacing your requests to avoid rate limits";
    case "high":
      return "⚠ High usage detected! You may hit rate limits soon. Consider waiting before making more requests.";
  }
}

export function deactivate() {
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
