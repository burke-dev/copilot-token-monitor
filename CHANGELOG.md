# Changelog

All notable changes to the Copilot Token Monitor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.2 (2026-03-04)

### Fixed
- Calibration button now icon-only with clearer tooltip/dialog
- Calibration recency indicator (green if recent, yellow if stale)
- Extension icon asset refreshed

## 0.1.1 (2026-03-04)

### Added
- Diagnostic calibration mode with retries and stop controls
- Calibration multiplier persisted to local settings
- Diagnostic traffic streaming to the output channel (optional)
- Usage details view with calibration summary
- Status bar button to start/stop calibration

### Changed
- Token estimation now applies calibration multiplier

## 0.1.0 (2026-02-28)

### ⚠ BREAKING CHANGES

- All commits must now follow Conventional Commits format

### Features

- add automatic semantic versioning system ([abfd8d9](https://github.com/burke-dev/copilot-token-monitor/commit/abfd8d9192c0cedd23bc442d8063505611dcd395))
- Add intelligent token estimation system with AI content detection ([fafc454](https://github.com/burke-dev/copilot-token-monitor/commit/fafc454679338e0ae88448988d051bdce6c6f2fc))