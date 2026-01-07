#!/usr/bin/env bash
# Create a GitHub release with tag for forma monorepo
# Usage: ./create-release.sh <version> <release-notes-file>
#
# This script:
# 1. Updates root package.json version
# 2. Updates packages/forma-core/package.json version
# 3. Updates packages/forma-react/package.json version and forma-core dependency
# 4. Commits version bump and creates git tag
# 5. Pushes commit and tag
# 6. Creates GitHub release

set -e

VERSION="${1:-}"
NOTES_FILE="${2:-}"

if [[ -z "$VERSION" ]]; then
    echo "Error: Version required"
    echo "Usage: ./create-release.sh <version> <release-notes-file>"
    exit 1
fi

if [[ -z "$NOTES_FILE" || ! -f "$NOTES_FILE" ]]; then
    echo "Error: Release notes file required"
    echo "Usage: ./create-release.sh <version> <release-notes-file>"
    exit 1
fi

# Ensure version doesn't have 'v' prefix for npm
NPM_VERSION="${VERSION#v}"
# Ensure tag has 'v' prefix
GIT_TAG="v${NPM_VERSION}"

echo "=== Creating release ${GIT_TAG} ==="

# Step 1: Update root package.json version
echo "Updating root package.json to version ${NPM_VERSION}..."
npm version "${NPM_VERSION}" --no-git-tag-version --allow-same-version

# Step 2: Update forma-core package.json version
echo "Updating packages/forma-core/package.json to version ${NPM_VERSION}..."
cd packages/forma-core
npm version "${NPM_VERSION}" --no-git-tag-version --allow-same-version
cd ../..

# Step 3: Update forma-react package.json version and dependency
echo "Updating packages/forma-react/package.json to version ${NPM_VERSION}..."
cd packages/forma-react
npm version "${NPM_VERSION}" --no-git-tag-version --allow-same-version
# Update the forma-core dependency version
npm pkg set "dependencies.@fogpipe/forma-core=^${NPM_VERSION}"
cd ../..

# Step 4: Commit version bump and create tag
echo "Committing version bump..."
git add package.json package-lock.json packages/forma-core/package.json packages/forma-react/package.json
git commit -m "chore: bump version to ${NPM_VERSION}" || echo "No changes to commit"

echo "Creating git tag ${GIT_TAG}..."
git tag -a "${GIT_TAG}" -m "Release ${GIT_TAG}"

# Step 5: Push commit and tag
echo "Pushing to remote..."
git push
git push --tags

# Step 6: Create GitHub release
echo "Creating GitHub release..."
gh release create "${GIT_TAG}" \
    --title "${GIT_TAG}" \
    --notes-file "${NOTES_FILE}"

echo ""
echo "=== Release complete ==="
echo "Version: ${GIT_TAG}"
echo "GitHub: $(gh repo view --json url -q '.url')/releases/tag/${GIT_TAG}"
echo ""
echo "The publish workflow will now:"
echo "  1. Run quality checks"
echo "  2. Publish @fogpipe/forma-core to GitHub Packages"
echo "  3. Publish @fogpipe/forma-react to GitHub Packages"
