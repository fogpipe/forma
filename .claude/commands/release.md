---
description: Create a new release with semantic versioning
allowed-tools: Bash(./scripts/check-release-prereqs.sh:*), Bash(./scripts/get-release-info.sh:*), Bash(./scripts/create-release.sh:*), Bash(rm -f ./temp-release-notes.md:*), Bash(npx turbo run lint check-types build test:*), Bash(git status:*), Read, Write
---

Create a new GitHub release with proper semantic versioning. This will trigger the publish workflow to release packages to GitHub Packages.

## Steps

### 1. Check Prerequisites

Run `./scripts/check-release-prereqs.sh`

If it fails, STOP and report the errors to the user.

### 2. Run Quality Checks

Run `npx turbo run lint check-types build test`

If any check fails, STOP and report the errors. Do NOT attempt to auto-fix for releases.

### 3. Get Release Information

Run `./scripts/get-release-info.sh`

This outputs:
- FROM_TAG: The starting point (previous release or first commit)
- TO_REF: The ending point (HEAD)
- IS_FIRST_RELEASE: Whether this is the first release
- CURRENT_VERSION: Current version in root package.json
- CORE_VERSION: Current @fogpipe/forma-core version
- REACT_VERSION: Current @fogpipe/forma-react version
- REPO_URL: GitHub repository URL
- Changed files list
- Commit messages
- Full diff

### 4. Analyze Changes

Review the commits and diff to categorize changes using conventional commit prefixes:

- **BREAKING CHANGES**: Look for exclamation mark suffix (feat!) or BREAKING CHANGE footer in commit body. API changes, removed features, changed behavior
- **Features** (`feat:`): New functionality, new APIs, new components
- **Fixes** (`fix:`): Bug fixes, error handling improvements
- **Performance** (`perf:`): Performance improvements
- **Refactor** (`refactor:`): Code changes that neither fix bugs nor add features
- **Docs** (`docs:`): Documentation only changes
- **Chore** (`chore:`): Build, CI, dependencies, tooling

### 5. Determine Version Bump

Based on semantic versioning (https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes that require users to modify their integrations
- **MINOR** (x.Y.0): New features that are backward compatible
- **PATCH** (x.y.Z): Bug fixes and minor improvements that are backward compatible

If unsure, prefer the more conservative (smaller) bump.

Present your analysis:

```
## Changes since <FROM_TAG>:

### Breaking Changes
- (list or "None")

### New Features
- (list or "None")

### Bug Fixes
- (list or "None")

### Other Changes
- (list or "None")

## Recommended version bump: <MAJOR|MINOR|PATCH>
Current version: <CURRENT_VERSION>
New version: <proposed>
```

**Ask user to confirm the version before proceeding.**

### 6. Create Release Notes File

Write release notes to `./temp-release-notes.md`:

```markdown
## What's Changed

### Breaking Changes
- (only if any)

### New Features
- (only if any)

### Bug Fixes
- (only if any)

### Other Changes
- (only if any)

**Full Changelog**: <REPO_URL>/compare/<FROM_TAG>...v<new-version>
```

Only include sections that have content.

### 7. Execute Release

Run `./scripts/create-release.sh <new-version> ./temp-release-notes.md`

This will:
1. Update root package.json version
2. Update packages/forma-core/package.json version
3. Update packages/forma-react/package.json version and @fogpipe/forma-core dependency
4. Commit version bump with conventional commit message
5. Create annotated git tag
6. Push commit and tag to remote
7. Create GitHub release with the notes

The tag push will trigger the GitHub Actions publish workflow to:
1. Run all quality checks again
2. Publish @fogpipe/forma-core to GitHub Packages
3. Publish @fogpipe/forma-react to GitHub Packages

### 8. Cleanup

Run `rm -f ./temp-release-notes.md`

## Output

Report the results:
- New version number
- GitHub release URL
- Note that the publish workflow has been triggered
- Remind user to check the Actions tab for publish progress
