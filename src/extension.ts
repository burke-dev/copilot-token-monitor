import * as vscode from "vscode";
import { TokenTracker } from "./tokenTracker";
import { StatusBarManager } from "./statusBarManager";
import { Logger } from "./logger";
import { TokenEstimator } from "./tokenEstimator";

let tokenTracker: TokenTracker;
let statusBarManager: StatusBarManager;
let logger: Logger;
let tokenEstimator: TokenEstimator;

export function activate(context: vscode.ExtensionContext) {
  console.log("Copilot Token Monitor is now active!");

  // Initialize logger
  logger = new Logger();
  context.subscriptions.push(logger);
  logger.info("Extension activated");

  // Initialize token estimator
  tokenEstimator = new TokenEstimator(logger);

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

  // Monitor text document changes to detect AI-generated content
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    async (event) => {
      const estimation = tokenEstimator.estimateFromTextChange(event);

      if (estimation && estimation.confidence !== "low") {
        await tokenTracker.recordUsage(
          estimation.tokens,
          `${estimation.type}:${event.document.languageId}`,
        );
        statusBarManager.update();

        // Log high-confidence detections
        if (estimation.confidence === "high") {
          logger.info("AI-generated content detected", {
            type: estimation.type,
            tokens: estimation.tokens,
            language: event.document.languageId,
            file: event.document.fileName,
          });
        }
      }
    },
  );

  // Monitor chat panel commands
  const chatCommandListener = vscode.commands.registerCommand(
    "workbench.action.chat.open",
    async () => {
      // User opened chat - estimate baseline tokens
      await tokenTracker.recordUsage(100, "chat:opened");
      statusBarManager.update();
      logger.info("Copilot chat opened");
    },
  );

  // Monitor inline chat (Cmd+I)
  const inlineChatListener = vscode.commands.registerCommand(
    "inlineChat.start",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectionLength = editor.document.getText(selection).length;
        // Estimate tokens for inline chat interaction
        const tokens = tokenEstimator.estimateInlineChatTokens(
          "",
          selectionLength,
        );
        await tokenTracker.recordUsage(tokens, "inline-chat");
        statusBarManager.update();
        logger.info("Inline chat started", { selectionLength, tokens });
      }
    },
  );

  context.subscriptions.push(
    documentChangeListener,
    chatCommandListener,
    inlineChatListener,
  );

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
