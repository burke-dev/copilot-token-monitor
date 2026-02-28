# Versioning Guide

This project uses [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

## Commit Message Format

Use the following format for commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (triggers MINOR version bump)
- **fix**: A bug fix (triggers PATCH version bump)
- **perf**: Performance improvement (triggers PATCH version bump)
- **docs**: Documentation changes only
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring without feature changes
- **test**: Adding or updating tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Other changes that don't modify src or test files

### Breaking Changes

Add `BREAKING CHANGE:` in the footer to trigger a MAJOR version bump:

```
feat: redesign token estimation algorithm

BREAKING CHANGE: The estimation API has changed. Previous thresholds are no longer valid.
```

## Releasing New Versions

### Automatic (Recommended)

```bash
# Automatically determine version bump based on commits
npm run release

# Force specific version bumps
npm run release:patch  # 0.0.1 -> 0.0.2
npm run release:minor  # 0.0.1 -> 0.1.0
npm run release:major  # 0.0.1 -> 1.0.0
```

This will:
1. Analyze commits since last release
2. Determine version bump (major/minor/patch)
3. Update package.json version
4. Generate/update CHANGELOG.md
5. Create a git commit
6. Create a git tag

### Manual Steps After Release

```bash
# Push the release commit and tag
git push --follow-tags origin main

# Build and package the extension
npm run publish:vsix

# The .vsix file will be in the root directory
# Install it manually or publish to marketplace
```

## Publishing to VS Code Marketplace

1. Create a Personal Access Token on Azure DevOps
2. Create a publisher account
3. Run:
   ```bash
   vsce publish
   ```

## Version History

- **0.0.1** - Initial release with token tracking
- **Future releases** - Will be tracked in CHANGELOG.md

## Examples

```bash
# Adding a new feature
git commit -m "feat: add inline chat detection"
npm run release  # Bumps to 0.1.0

# Fixing a bug
git commit -m "fix: correct token calculation for TypeScript files"
npm run release  # Bumps to 0.1.1

# Breaking change
git commit -m "feat: redesign status bar UI

BREAKING CHANGE: Status bar format has changed"
npm run release  # Bumps to 1.0.0
```

## Configuration

The versioning is configured in `.versionrc.json`. You can customize:
- Commit types included in CHANGELOG
- URL formats for GitHub links
- Release commit message format
- Post-release scripts
