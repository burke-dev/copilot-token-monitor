import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import {
  DiagnosticModeManager,
  DiagnosticTokenTracker,
} from "../diagnosticMode";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test("Diagnostic mode runs configured tests", async function () {
    this.timeout(5000);
    class FakeTokenTracker implements DiagnosticTokenTracker {
      private entries: Array<{ timestamp: number; tokens: number }> = [];

      async recordDiagnosticUsage(tokens: number): Promise<void> {
        this.entries.push({ timestamp: Date.now(), tokens });
      }

      getDiagnosticTotalsSince(sinceTimestamp: number): {
        totalTokens: number;
        requestCount: number;
      } {
        const entries = this.entries.filter(
          (entry) => entry.timestamp >= sinceTimestamp,
        );
        return {
          totalTokens: entries.reduce((sum, entry) => sum + entry.tokens, 0),
          requestCount: entries.length,
        };
      }

      getEntryCount(): number {
        return this.entries.length;
      }
    }

    const tracker = new FakeTokenTracker();
    const statusUpdates: any[] = [];
    let calibrationResult: any;
    const logger = {
      info: () => undefined,
      warning: () => undefined,
    } as any;

    const manager = new DiagnosticModeManager(
      tracker,
      logger,
      (status) => statusUpdates.push(status),
      {
        totalTests: 2,
        maxRetries: 1,
        inputDelayMs: 1,
        outputDelayMs: 1,
        showDiagnosticsInChat: false,
      },
      (result) => {
        calibrationResult = result;
      },
    );

    await manager.start();

    assert.strictEqual(manager.isActive(), false);
    assert.strictEqual(tracker.getEntryCount(), 4);
    assert.ok(statusUpdates.length > 0);
    assert.ok(calibrationResult);
    assert.strictEqual(calibrationResult.scale, 1);
  });
});
