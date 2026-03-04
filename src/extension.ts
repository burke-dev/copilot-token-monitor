import * as vscode from "vscode";
import { TokenTracker } from "./tokenTracker";
import { StatusBarManager } from "./statusBarManager";
import { Logger } from "./logger";
import { TokenEstimator } from "./tokenEstimator";
import {
  DiagnosticModeManager,
  DiagnosticCalibrationResult,
} from "./diagnosticMode";

let tokenTracker: TokenTracker;
let statusBarManager: StatusBarManager;
let logger: Logger;
let tokenEstimator: TokenEstimator;
let diagnosticModeManager: DiagnosticModeManager;
const calibrationKey = "copilotTokenMonitor.calibrationMultiplier";
const calibrationSummaryKey = "copilotTokenMonitor.calibrationSummary";
let detailsDialogOpen = false;
let calibrationSummary: DiagnosticCalibrationResult | undefined;
let detailsPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Copilot Token Monitor is now active!");

  // Initialize logger
  logger = new Logger();
  context.subscriptions.push(logger);
  logger.info("Extension activated");

  // Initialize token estimator
  tokenEstimator = new TokenEstimator(logger);
  const storedCalibration = context.globalState.get<number>(calibrationKey);
  if (typeof storedCalibration === "number" && storedCalibration > 0) {
    tokenEstimator.setCalibrationMultiplier(storedCalibration);
  }
  calibrationSummary = context.globalState.get<DiagnosticCalibrationResult>(
    calibrationSummaryKey,
  );

  // Initialize token tracker
  tokenTracker = new TokenTracker(context, logger);

  // Initialize status bar manager
  statusBarManager = new StatusBarManager(tokenTracker, context);

  // Initialize diagnostic mode manager
  diagnosticModeManager = new DiagnosticModeManager(
    tokenTracker,
    logger,
    (status) => statusBarManager.setDiagnosticStatus(status),
    undefined,
    async (calibration) => {
      if (Number.isFinite(calibration.scale) && calibration.scale > 0) {
        await context.globalState.update(calibrationKey, calibration.scale);
        tokenEstimator.setCalibrationMultiplier(calibration.scale);
      }
      calibrationSummary = calibration;
      await context.globalState.update(calibrationSummaryKey, calibration);
    },
  );
  statusBarManager.setDiagnosticStatus(diagnosticModeManager.getStatus());

  // Register command to show detailed metrics
  const showDetailsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.showDetails",
    async () => {
      if (detailsPanel) {
        detailsPanel.reveal();
        detailsPanel.webview.html = buildDetailsHtml(
          tokenTracker.getMetrics(),
          calibrationSummary,
        );
        return;
      }

      if (detailsDialogOpen) {
        return;
      }

      detailsDialogOpen = true;
      const metrics = tokenTracker.getMetrics();
      detailsPanel = vscode.window.createWebviewPanel(
        "copilotTokenMonitor.details",
        "Copilot Token Usage",
        vscode.ViewColumn.Beside,
        {
          enableFindWidget: true,
        },
      );
      detailsPanel.webview.html = buildDetailsHtml(metrics, calibrationSummary);
      detailsPanel.onDidDispose(() => {
        detailsPanel = undefined;
      });
      detailsPanel.onDidChangeViewState(() => {
        if (detailsPanel) {
          detailsPanel.webview.html = buildDetailsHtml(
            tokenTracker.getMetrics(),
            calibrationSummary,
          );
        }
      });
      detailsDialogOpen = false;
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

  const startDiagnosticsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.startDiagnostics",
    async () => {
      const settings = vscode.workspace.getConfiguration("copilotTokenMonitor");
      const showDiagnosticsInChat = settings.get<boolean>(
        "showDiagnosticsInChat",
        true,
      );
      diagnosticModeManager.updateConfig({ showDiagnosticsInChat });
      await diagnosticModeManager.start();
    },
  );

  const stopDiagnosticsCommand = vscode.commands.registerCommand(
    "copilot-token-monitor.stopDiagnostics",
    async () => {
      await diagnosticModeManager.stop();
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
      if (diagnosticModeManager.isActive()) {
        vscode.window.showWarningMessage(
          "Diagnostic mode is active. Prompts are blocked until diagnostics complete.",
        );
        return;
      }
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
      if (diagnosticModeManager.isActive()) {
        vscode.window.showWarningMessage(
          "Diagnostic mode is active. Prompts are blocked until diagnostics complete.",
        );
        return;
      }
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
    startDiagnosticsCommand,
    stopDiagnosticsCommand,
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

function buildDetailsHtml(
  metrics: {
    totalTokens: number;
    requestCount: number;
    avgTokensPerMinute: number;
    usageLevel: number;
    status: "low" | "medium" | "high";
  },
  summary?: DiagnosticCalibrationResult,
): string {
  const calibrationDetails = summary
    ? `Calibration Scale: ${summary.scale.toFixed(2)}\nAverage Expected: ${summary.averageExpected.toFixed(2)}\nAverage Observed: ${summary.averageObserved.toFixed(2)}\nSamples: ${summary.samples}`
    : "Calibration: Not run yet";

  const detailsText = `Copilot Token Usage (2-Hour Window)\n\nTotal Tokens: ${metrics.totalTokens.toLocaleString()}\nRequest Count: ${metrics.requestCount}\nAvg Tokens/Min: ${metrics.avgTokensPerMinute.toFixed(1)}\nUsage Level: ${(metrics.usageLevel * 100).toFixed(0)}%\nStatus: ${metrics.status.toUpperCase()}\n\n${calibrationDetails}\n\n${getUsageTip(metrics.status)}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Token Usage</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        padding: 16px;
      }
      pre {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-editorWidget-border);
        border-radius: 6px;
        padding: 12px;
        white-space: pre-wrap;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 12px 0;
      }
    </style>
  </head>
  <body>
    <h1>Copilot Token Usage</h1>
    <pre>${detailsText.replace(/</g, "&lt;")}</pre>
  </body>
</html>`;
}

export function deactivate() {
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
