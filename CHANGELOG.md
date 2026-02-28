# Changelog

All notable changes to the Copilot Token Monitor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 (2026-02-28)


### ⚠ BREAKING CHANGES

* All commits must now follow Conventional Commits format

### Features

* add automatic semantic versioning system ([abfd8d9](https://github.com/burke-dev/copilot-token-monitor/commit/abfd8d9192c0cedd23bc442d8063505611dcd395))
* Add intelligent token estimation system with AI content detection ([fafc454](https://github.com/burke-dev/copilot-token-monitor/commit/fafc454679338e0ae88448988d051bdce6c6f2fc))

# Changelog

All notable changes to the Copilot Token Monitor extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Intelligent token estimation system with AI content detection
- TokenEstimator class for smart pattern recognition
- Context-aware token counting with language-specific adjustments
- Confidence scoring system (high/medium/low) for detections
- Comprehensive test suite (test-copilot-detection.js)
- Detailed logging with detection metadata
- Automatic semantic versioning with standard-version

### Changed
- Enhanced README with estimation methodology and accuracy notes
- Improved documentation with comprehensive "How It Works" section

### Fixed
- Made TokenTracker.checkForRateLimit() public for proper access