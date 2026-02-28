import * as vscode from "vscode";
import { Logger } from "./logger";

/**
 * Estimates token usage for different types of Copilot interactions
 */
export class TokenEstimator {
  private lastDocumentState = new WeakMap<
    vscode.TextDocument,
    { text: string; timestamp: number }
  >();
  private recentChanges: Array<{
    timestamp: number;
    length: number;
    type: string;
  }> = [];

  constructor(private logger: Logger) { }

  /**
   * Estimate tokens from a text change event
   * This detects AI-generated content by analyzing the change pattern
   */
  estimateFromTextChange(
    event: vscode.TextDocumentChangeEvent,
  ): { tokens: number; confidence: "high" | "medium" | "low"; type: string } | null {
    // Ignore changes in output channels, terminals, etc.
    if (
      event.document.uri.scheme !== "file" &&
      event.document.uri.scheme !== "untitled"
    ) {
      return null;
    }

    // Filter out manual typing (usually single character or small changes)
    const changes = event.contentChanges;
    if (changes.length === 0) {
      return null;
    }

    // Aggregate all changes in this event
    const totalTextAdded = changes
      .filter((c) => c.text.length > c.rangeLength)
      .reduce((sum, c) => sum + (c.text.length - c.rangeLength), 0);

    const totalTextRemoved = changes
      .filter((c) => c.rangeLength > c.text.length)
      .reduce((sum, c) => sum + (c.rangeLength - c.text.length), 0);

    // Track recent changes to detect patterns
    this.recentChanges.push({
      timestamp: Date.now(),
      length: totalTextAdded,
      type: "add",
    });

    // Clean old changes (older than 2 seconds)
    this.recentChanges = this.recentChanges.filter(
      (c) => Date.now() - c.timestamp < 2000,
    );

    // Detect AI-generated content patterns:
    // 1. Large insertion (>50 chars) - likely completion
    // 2. Multi-line insertion - likely completion
    // 3. Rapid successive insertions - likely streaming completion

    let tokens = 0;
    let confidence: "high" | "medium" | "low" = "low";
    let type = "unknown";

    if (totalTextAdded > 100) {
      // Large insertion - likely AI completion
      tokens = this.countTokens(
        changes.map((c) => c.text).join(""),
        event.document.languageId,
      );
      confidence = "high";
      type = "completion";
    } else if (totalTextAdded > 30) {
      // Medium insertion - possibly AI
      const hasNewlines = changes.some((c) => c.text.includes("\n"));
      if (hasNewlines) {
        tokens = this.countTokens(
          changes.map((c) => c.text).join(""),
          event.document.languageId,
        );
        confidence = "medium";
        type = "completion";
      } else {
        // Small single-line change - probably manual typing
        return null;
      }
    } else if (this.recentChanges.length > 3) {
      // Rapid successive changes - likely streaming completion
      const totalRecent = this.recentChanges.reduce(
        (sum, c) => sum + c.length,
        0,
      );
      tokens = Math.ceil(totalRecent / 4);
      confidence = "medium";
      type = "streaming-completion";
    } else {
      // Small change - likely manual
      return null;
    }

    // Add context tokens (input prompt estimation)
    // Copilot uses surrounding code as context
    const contextTokens = this.estimateContextTokens(event.document);
    tokens += contextTokens;

    this.logger.info("Estimated token usage", {
      type,
      outputTokens: tokens - contextTokens,
      contextTokens,
      totalTokens: tokens,
      confidence,
      textLength: totalTextAdded,
      language: event.document.languageId,
    });

    return { tokens, confidence, type };
  }

  /**
   * Estimate tokens in a string based on language
   */
  private countTokens(text: string, languageId: string): number {
    // Basic token estimation: ~4 characters per token for code
    // Adjust based on language characteristics
    let charsPerToken = 4;

    // Languages with longer tokens
    if (["markdown", "plaintext", "latex"].includes(languageId)) {
      charsPerToken = 5; // Natural language is more efficient
    }

    // Languages with shorter tokens (more symbols/operators)
    if (["json", "yaml", "xml", "html"].includes(languageId)) {
      charsPerToken = 3.5;
    }

    // Count actual tokens more accurately
    // Split on whitespace and symbols to get a better estimate
    const words = text.split(/[\s\n\r]+/).filter((w) => w.length > 0);
    const symbols = (text.match(/[{}()\[\];,.<>:]/g) || []).length;

    // Approximate: words + symbols, with adjustment
    const estimatedTokens = Math.ceil(
      words.length * 0.75 + symbols * 0.5 + text.length / charsPerToken * 0.25,
    );

    return Math.max(1, estimatedTokens);
  }

  /**
   * Estimate context tokens sent to Copilot
   * Copilot typically sends surrounding code as context
   */
  private estimateContextTokens(document: vscode.TextDocument): number {
    // Copilot uses ~2-4KB of surrounding context
    // Estimate based on file size and position
    const fileSize = document.getText().length;

    // Smaller files = send more of the file
    // Larger files = send a fixed window
    let contextChars = 0;

    if (fileSize < 5000) {
      contextChars = fileSize; // Send whole file
    } else if (fileSize < 20000) {
      contextChars = 5000; // Send ~5KB
    } else {
      contextChars = 8000; // Send ~8KB for large files
    }

    // Convert to tokens (rough estimate)
    return Math.ceil(contextChars / 4);
  }

  /**
   * Estimate tokens for a chat request
   * This is used when we can detect chat commands
   */
  estimateChatTokens(
    prompt: string,
    includeWorkspaceContext: boolean = true,
  ): { inputTokens: number; estimatedOutputTokens: number } {
    const promptTokens = this.countTokens(prompt, "markdown");

    // Chat typically includes workspace context
    let contextTokens = 0;
    if (includeWorkspaceContext) {
      // Estimate based on workspace size
      contextTokens = 2000; // Conservative estimate
    }

    const inputTokens = promptTokens + contextTokens;

    // Estimate output tokens based on prompt length
    // Typical response is 1-3x the prompt length
    const estimatedOutputTokens = Math.ceil(promptTokens * 1.5);

    this.logger.info("Estimated chat token usage", {
      promptTokens,
      contextTokens,
      inputTokens,
      estimatedOutputTokens,
      totalEstimate: inputTokens + estimatedOutputTokens,
    });

    return { inputTokens, estimatedOutputTokens };
  }

  /**
   * Estimate tokens for inline chat (Cmd+I)
   */
  estimateInlineChatTokens(
    prompt: string,
    selectionLength: number,
  ): number {
    const promptTokens = this.countTokens(prompt, "markdown");
    const selectionTokens = Math.ceil(selectionLength / 4);

    // Inline chat includes selection + prompt + output
    const inputTokens = promptTokens + selectionTokens;
    const outputTokens = Math.max(selectionTokens * 0.5, promptTokens * 1.5);

    const total = Math.ceil(inputTokens + outputTokens);

    this.logger.info("Estimated inline chat token usage", {
      promptTokens,
      selectionTokens,
      inputTokens,
      outputTokens,
      total,
    });

    return total;
  }

  /**
   * Detect if a change is likely from Copilot vs manual typing
   */
  isLikelyAIGenerated(change: vscode.TextDocumentContentChangeEvent): boolean {
    // Heuristics for AI-generated content:
    // - Large insertions (>30 chars at once)
    // - Multi-line insertions
    // - Contains code patterns (functions, classes, etc.)
    // - Inserted all at once (not character by character)

    const text = change.text;
    const length = text.length;

    if (length < 30) {
      return false; // Too small to be AI
    }

    if (text.includes("\n")) {
      return true; // Multi-line insertion
    }

    // Check for code patterns
    const codePatterns = [
      /function\s+\w+/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /=>\s*{/,
    ];

    if (codePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    return length > 100; // Large single-line insertion
  }
}
