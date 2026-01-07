#!/usr/bin/env bash
# Get information about releases and changes
# Usage: ./get-release-info.sh [from-tag] [to-ref]
# Output: Structured text with release info, commits, and diff stats

set -e

FROM_TAG="${1:-}"
TO_REF="${2:-HEAD}"

# Get latest release if no from-tag provided
if [[ -z "$FROM_TAG" ]]; then
    LATEST_RELEASE=$(gh release list --limit 1 --json tagName,publishedAt 2>/dev/null || echo "[]")

    if [[ "$LATEST_RELEASE" == "[]" || "$LATEST_RELEASE" == "" ]]; then
        # No previous release - use first commit
        FROM_TAG=$(git rev-list --max-parents=0 HEAD | head -1)
        IS_FIRST_RELEASE="true"
    else
        FROM_TAG=$(echo "$LATEST_RELEASE" | jq -r '.[0].tagName')
        IS_FIRST_RELEASE="false"
    fi
else
    IS_FIRST_RELEASE="false"
fi

# Get current version from root package.json
CURRENT_VERSION=$(jq -r '.version // "0.0.0"' package.json)

# Get current version from forma-core package.json
CORE_VERSION=$(jq -r '.version // "0.0.0"' packages/forma-core/package.json)

# Get current version from forma-react package.json
REACT_VERSION=$(jq -r '.version // "0.0.0"' packages/forma-react/package.json)

# Get commit log with conventional commit parsing
COMMITS=$(git log "${FROM_TAG}..${TO_REF}" --pretty=format:"%h|%s" 2>/dev/null || echo "")

# Get diff stats
DIFF_STAT=$(git diff "${FROM_TAG}..${TO_REF}" --stat 2>/dev/null | tail -1 || echo "")

# Get list of changed files
CHANGED_FILES=$(git diff "${FROM_TAG}..${TO_REF}" --name-only 2>/dev/null || echo "")

# Get repo info for changelog URL
REPO_URL=$(gh repo view --json url -q '.url' 2>/dev/null || echo "")

# Output as structured text (easier for Claude to parse)
cat << EOF
=== RELEASE INFO ===
FROM_TAG: ${FROM_TAG}
TO_REF: ${TO_REF}
IS_FIRST_RELEASE: ${IS_FIRST_RELEASE}
CURRENT_VERSION: ${CURRENT_VERSION}
CORE_VERSION: ${CORE_VERSION}
REACT_VERSION: ${REACT_VERSION}
REPO_URL: ${REPO_URL}

=== DIFF STATS ===
${DIFF_STAT}

=== CHANGED FILES ===
${CHANGED_FILES}

=== COMMITS ===
${COMMITS}

=== FULL DIFF ===
$(git diff "${FROM_TAG}..${TO_REF}" 2>/dev/null || echo "No diff available")
EOF
