# Copilot Token Monitor

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

The extension monitors token usage through VS Code's telemetry API and maintains a rolling 2-hour window of usage data. The algorithm:

1. **Records** each token usage event with timestamp
2. **Cleans** entries older than 2 hours automatically
3. **Calculates** usage metrics (total, average, rate)
4. **Updates** the visual indicator every 10 seconds
5. **Persists** data to VS Code's global state for cross-session tracking

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

## Known Limitations

- Token usage estimation is approximate and based on telemetry events
- The Copilot API is evolving; actual rate limits may vary
- Manual token recording is provided for testing purposes

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
