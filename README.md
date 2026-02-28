# Copilot Token Monitor

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/burke-dev/copilot-token-monitor)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A Visual Studio Code extension that tracks GitHub Copilot token usage in a 2-hour rolling window with a visual status bar indicator to help you avoid rate limiting.

## Features

- **Visual Progress Bar**: Real-time status bar indicator showing your current token usage level
- **2-Hour Rolling Window**: Tracks token usage over the past 2 hours to help predict rate limiting
- **Persistent Storage**: Usage history is saved across VS Code sessions
- **Detailed Metrics**: Hover over the status bar for comprehensive statistics
- **Smart Indicators**: Color-coded status (green/yellow/red) based on usage patterns

## Status Bar Indicator

The extension adds a progress bar to your status bar that shows:

- **Green (✓)**: Low usage - plenty of capacity available
- **Yellow (⚠)**: Moderate usage - consider pacing requests
- **Red (⚠)**: High usage - risk of hitting rate limits

## Usage Metrics

Hover over the status bar indicator to see:

- **Total Tokens**: Total tokens used in the 2-hour window
- **Request Count**: Number of requests made
- **Avg Tokens/Min**: Average token consumption per minute
- **Usage Level**: Current usage as a percentage

## Commands

Access these commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Copilot Token Monitor: Show Details** - Display detailed usage metrics
- **Copilot Token Monitor: Record Usage (Testing)** - Manually add token usage for testing
- **Copilot Token Monitor: Clear History** - Reset all usage history

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press `F5` to open a new VS Code window with the extension loaded
4. The status bar indicator will appear automatically

### From VSIX (when published)

1. Download the `.vsix` file
2. In VS Code, go to Extensions view
3. Click "..." menu → "Install from VSIX..."
4. Select the downloaded file

## How It Works

The extension estimates token usage by intelligently monitoring your coding activity:

### Token Estimation Methods

1. **AI-Generated Content Detection**
   - Monitors text document changes for patterns that indicate AI-generated code
   - Detects large insertions, multi-line completions, and streaming responses
   - Analyzes change frequency to identify Copilot activity vs manual typing

2. **Context-Aware Token Counting**
   - Estimates input tokens (prompt + surrounding code context)
   - Calculates output tokens based on generated content
   - Adjusts for different file types and languages

3. **Smart Confidence Scoring**
   - High confidence: Large multi-line insertions, clear AI patterns
   - Medium confidence: Rapid successive changes, moderate insertions
   - Low confidence: Small changes (ignored to avoid false positives)

4. **Language-Specific Adjustments**
   - Code languages: ~4 characters per token
   - Natural language: ~5 characters per token
   - Structured formats (JSON/XML): ~3.5 characters per token

### Data Management

The extension maintains a rolling 2-hour window of usage data:

1. **Records** each estimated token usage event with timestamp and type
2. **Cleans** entries older than 2 hours automatically (every 5 minutes)
3. **Calculates** usage metrics (total, average, rate)
4. **Updates** the visual indicator every 10 seconds
5. **Persists** data to VS Code's global state for cross-session tracking

### Accuracy & Limitations

**Important Note:** This extension provides *estimates* based on observable activity in VS Code. It cannot access Copilot's actual token usage data.

- ✅ **Good for:** Relative usage tracking, pattern detection, avoiding rate limits
- ⚠️ **Estimates may vary:** Actual tokens may differ by ±30%
- 🔍 **Manual typing filtered:** Small changes are ignored to reduce false positives
- 📊 **Best used for trends:** Track your usage patterns over time

The estimations are conservative and designed to help you stay under rate limits, not to provide exact billing information.

## Usage Level Calculation

The extension uses a heuristic to determine usage level:

- **Low** (0-30%): < 300 tokens/minute average
- **Medium** (30-70%): 300-700 tokens/minute average
- **High** (70-100%): > 700 tokens/minute average

These thresholds can be adjusted based on actual Copilot rate limits.

## Technical Details

- **Language**: TypeScript
- **Bundler**: esbuild
- **Storage**: VS Code Global State (Memento API)
- **Update Frequency**: 10 seconds (status bar), 5 minutes (cleanup)
- **Persistence**: Automatic across VS Code restarts

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Debugging

1. Open the extension in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in the source code
4. Use the Command Palette to trigger commands

## Versioning

This project uses [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

### Release Process

```bash
# Automatic version bump based on commits
npm run release

# Force specific version
npm run release:patch  # Bug fixes
npm run release:minor  # New features
npm run release:major  # Breaking changes

# Build extension package
npm run publish:vsix
```

See [VERSIONING.md](VERSIONING.md) for detailed guidelines.

## Known Limitations

- Token usage estimation is approximate and based on observable activity
- Estimates may vary ±30% from actual usage
- Best used for tracking trends and avoiding rate limits
- Cannot access Copilot's internal token counters

## Contributing

Contributions are welcome! Please:

1. Follow [Conventional Commits](https://www.conventionalcommits.org/) format
2. Write meaningful commit messages
3. Add tests for new features
4. Update documentation as needed

## License

MIT
