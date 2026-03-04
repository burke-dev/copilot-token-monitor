import * as vscode from "vscode";
import { Logger } from "./logger";
import { DiagnosticStatus } from "./statusBarManager";

export interface DiagnosticTokenTracker {
  recordDiagnosticUsage(tokens: number, requestId?: string): Promise<void>;
  getDiagnosticTotalsSince(sinceTimestamp: number): {
    totalTokens: number;
    requestCount: number;
  };
}

export interface DiagnosticModeConfig {
  totalTests: number;
  maxRetries: number;
  expectedInputTokens: number;
  expectedOutputTokens: number;
  tolerance: number;
  inputDelayMs: number;
  outputDelayMs: number;
  showDiagnosticsInChat: boolean;
}

export interface DiagnosticCalibrationResult {
  scale: number;
  averageObserved: number;
  averageExpected: number;
  samples: number;
}

const defaultDiagnosticConfig: DiagnosticModeConfig = {
  totalTests: 10,
  maxRetries: 3,
  expectedInputTokens: 4,
  expectedOutputTokens: 16,
  tolerance: 0.2,
  inputDelayMs: 200,
  outputDelayMs: 400,
  showDiagnosticsInChat: true,
};

export class DiagnosticModeManager {
  private active = false;
  private currentTest = 0;
  private currentAttempt = 0;
  private config: DiagnosticModeConfig;
  private cancelSource: vscode.CancellationTokenSource | undefined;
  private results: Array<{ expected: number; observed: number }> = [];

  constructor(
    private tokenTracker: DiagnosticTokenTracker,
    private logger: Logger,
    private updateStatus: (status: DiagnosticStatus) => void,
    config?: Partial<DiagnosticModeConfig>,
    private onCalibration?: (
      result: DiagnosticCalibrationResult,
    ) => Promise<void> | void,
  ) {
    this.config = { ...defaultDiagnosticConfig, ...config };
  }

  public updateConfig(config: Partial<DiagnosticModeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public isActive(): boolean {
    return this.active;
  }

  public getStatus(): DiagnosticStatus {
    return {
      active: this.active,
      currentTest: this.currentTest,
      totalTests: this.config.totalTests,
      currentAttempt: this.currentAttempt,
    };
  }

  public async start(): Promise<void> {
    if (this.active) {
      vscode.window.showInformationMessage(
        "Diagnostic mode is already running.",
      );
      return;
    }

    this.active = true;
    this.currentTest = 0;
    this.currentAttempt = 0;
    this.results = [];
    this.cancelSource = new vscode.CancellationTokenSource();
    await vscode.commands.executeCommand(
      "setContext",
      "copilotTokenMonitor.diagnosticActive",
      true,
    );

    this.updateStatus(this.getStatus());

    vscode.window.showInformationMessage(
      "Diagnostic mode started. Copilot Token Monitor will run a series of calibration tests. Prompts are temporarily blocked until diagnostics complete.",
      { modal: false },
    );

    if (this.config.showDiagnosticsInChat) {
      this.logger.show();
      this.logger.info(
        "Diagnostics visibility enabled. Streaming diagnostic traffic to Output → Copilot Token Monitor.",
      );
    }

    this.logger.info("Diagnostic mode started", {
      totalTests: this.config.totalTests,
      maxRetries: this.config.maxRetries,
    });

    for (
      let testIndex = 1;
      testIndex <= this.config.totalTests;
      testIndex += 1
    ) {
      if (this.cancelSource.token.isCancellationRequested) {
        break;
      }

      this.currentTest = testIndex;
      this.currentAttempt = 0;
      this.updateStatus(this.getStatus());

      const result = await this.runTestSeries(testIndex);
      if (result === "stopped") {
        break;
      }
    }

    await this.finish();
  }

  public async stop(): Promise<void> {
    if (!this.active) {
      vscode.window.showInformationMessage("Diagnostic mode is not running.");
      return;
    }

    this.logger.warning("Diagnostic mode stopped by user", {
      currentTest: this.currentTest,
      currentAttempt: this.currentAttempt,
    });
    this.cancelSource?.cancel();
    await this.finish();
  }

  private async finish(): Promise<void> {
    this.active = false;
    this.currentTest = 0;
    this.currentAttempt = 0;
    this.updateStatus(this.getStatus());
    await vscode.commands.executeCommand(
      "setContext",
      "copilotTokenMonitor.diagnosticActive",
      false,
    );
    this.cancelSource?.dispose();
    this.cancelSource = undefined;

    const calibration = this.calculateCalibration();
    if (calibration && this.onCalibration) {
      await Promise.resolve(this.onCalibration(calibration));
    }

    vscode.window.showInformationMessage("Diagnostic mode complete.");
    this.logger.info("Diagnostic mode finished");
  }

  private async runTestSeries(testIndex: number): Promise<"ok" | "stopped"> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt += 1) {
      if (this.cancelSource?.token.isCancellationRequested) {
        return "stopped";
      }

      this.currentAttempt = attempt;
      this.updateStatus(this.getStatus());

      const result = await this.runSingleTest(testIndex, attempt);
      if (result.withinRange) {
        this.results.push({
          expected: result.expectedTokens,
          observed: result.observedTokens,
        });
        return "ok";
      }

      if (attempt < this.config.maxRetries) {
        const action = await vscode.window.showWarningMessage(
          `Diagnostic test ${testIndex} (attempt ${attempt}) is outside expected parameters. Retry?`,
          "Retry",
          "Continue",
          "Stop",
        );

        if (action === "Stop") {
          return "stopped";
        }

        if (action === "Continue") {
          this.results.push({
            expected: result.expectedTokens,
            observed: result.observedTokens,
          });
          return "ok";
        }

        this.logger.warning("Retrying diagnostic test", {
          testIndex,
          attempt,
          observedTokens: result.observedTokens,
        });
        continue;
      }

      const finalAction = await vscode.window.showWarningMessage(
        `Diagnostic test ${testIndex} exceeded retry limit. Continue diagnostics?`,
        "Continue",
        "Stop",
      );

      if (finalAction === "Stop") {
        return "stopped";
      }

      this.results.push({
        expected: result.expectedTokens,
        observed: result.observedTokens,
      });
      return "ok";
    }

    return "ok";
  }

  private async runSingleTest(
    testIndex: number,
    attempt: number,
  ): Promise<{
    withinRange: boolean;
    observedTokens: number;
    expectedTokens: number;
  }> {
    const expectedTotal =
      this.config.expectedInputTokens + this.config.expectedOutputTokens;
    const startTime = Date.now();

    this.logger.info("Diagnostic test started", {
      testIndex,
      attempt,
      expectedInputTokens: this.config.expectedInputTokens,
      expectedOutputTokens: this.config.expectedOutputTokens,
    });

    if (this.config.showDiagnosticsInChat) {
      this.logger.info("Diagnostic traffic", {
        testIndex,
        attempt,
        direction: "send",
        tokens: this.config.expectedInputTokens,
      });
    }

    await this.tokenTracker.recordDiagnosticUsage(
      this.config.expectedInputTokens,
      `diagnostic:${testIndex}:input:${attempt}`,
    );

    await this.delay(this.config.inputDelayMs);

    if (this.config.showDiagnosticsInChat) {
      this.logger.info("Diagnostic traffic", {
        testIndex,
        attempt,
        direction: "receive",
        tokens: this.config.expectedOutputTokens,
      });
    }

    await this.tokenTracker.recordDiagnosticUsage(
      this.config.expectedOutputTokens,
      `diagnostic:${testIndex}:output:${attempt}`,
    );

    await this.delay(this.config.outputDelayMs);

    const observedTokens =
      this.tokenTracker.getDiagnosticTotalsSince(startTime).totalTokens;

    const lowerBound = expectedTotal * (1 - this.config.tolerance);
    const upperBound = expectedTotal * (1 + this.config.tolerance);
    const withinRange =
      observedTokens >= lowerBound && observedTokens <= upperBound;

    this.logger.info("Diagnostic test completed", {
      testIndex,
      attempt,
      expectedTotal,
      observedTokens,
      withinRange,
    });

    return { withinRange, observedTokens, expectedTokens: expectedTotal };
  }

  private calculateCalibration(): DiagnosticCalibrationResult | null {
    if (this.results.length === 0) {
      return null;
    }

    const totalExpected = this.results.reduce(
      (sum, entry) => sum + entry.expected,
      0,
    );
    const totalObserved = this.results.reduce(
      (sum, entry) => sum + entry.observed,
      0,
    );
    const averageExpected = totalExpected / this.results.length;
    const averageObserved = totalObserved / this.results.length;

    const scale = averageExpected > 0 ? averageObserved / averageExpected : 1;

    this.logger.info("Diagnostic calibration summary", {
      averageExpected,
      averageObserved,
      scale,
      samples: this.results.length,
    });

    return {
      scale,
      averageExpected,
      averageObserved,
      samples: this.results.length,
    };
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
