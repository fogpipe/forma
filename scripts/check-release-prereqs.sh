#!/usr/bin/env bash
# Check prerequisites for creating a release
# Exits with error if any requirement is not met

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

errors=0

# Check gh cli is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh (GitHub CLI) not installed${NC}"
    errors=1
else
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}Error: gh not authenticated. Run 'gh auth login'${NC}"
        errors=1
    else
        echo -e "${GREEN}✓${NC} gh CLI authenticated"
    fi
fi

# Check we're in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    errors=1
else
    echo -e "${GREEN}✓${NC} Git repository detected"
fi

# Check we're on main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "main" ]]; then
    echo -e "${RED}Error: Not on main branch (currently on: $current_branch)${NC}"
    echo "Switch to main branch before creating a release"
    errors=1
else
    echo -e "${GREEN}✓${NC} On main branch"
fi

# Check for uncommitted changes (excluding untracked files)
if [[ -n $(git status --porcelain -uno) ]]; then
    echo -e "${RED}Error: Uncommitted changes detected${NC}"
    echo "Commit or stash changes before creating a release"
    git status --short -uno
    errors=1
else
    echo -e "${GREEN}✓${NC} Working tree clean"
fi

# Check we're up to date with remote
git fetch origin main --quiet
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse origin/main)
if [[ "$local_sha" != "$remote_sha" ]]; then
    echo -e "${RED}Error: Local main is not up to date with origin/main${NC}"
    echo "Pull the latest changes: git pull origin main"
    errors=1
else
    echo -e "${GREEN}✓${NC} Up to date with remote"
fi

# Check node/npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm not installed${NC}"
    errors=1
else
    echo -e "${GREEN}✓${NC} npm available"
fi

if [[ $errors -gt 0 ]]; then
    exit 1
fi

echo ""
echo -e "${GREEN}All prerequisites met!${NC}"
