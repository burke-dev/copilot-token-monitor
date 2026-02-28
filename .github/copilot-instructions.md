# Copilot Token Monitor Extension

[x] Project successfully created and compiled

## Project Overview
VS Code extension for tracking GitHub Copilot token usage with:
- 2-hour rolling window tracking
- Visual progress bar status indicator
- Persistent storage across sessions
- Detailed metrics tooltip

## Architecture
- **tokenTracker.ts**: Token usage tracking with 2-hour rolling window and persistent storage
- **statusBarManager.ts**: Status bar UI with progress bar and detailed tooltip
- **extension.ts**: Main activation logic and command registration

## Features Implemented
- Real-time token usage monitoring
- Color-coded status indicators (green/yellow/red)
- Detailed metrics on hover
- Commands for showing details, recording usage, and clearing history
- Automatic cleanup of old entries
- Persistent storage using VS Code global state

## Testing
Press F5 to launch Extension Development Host and test the extension.
Use "Copilot Token Monitor: Record Usage" command to simulate token usage.
