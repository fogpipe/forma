# Forma - Declarative forms with FEEL expressions

# Default: show available commands
default:
    @just --choose

# ==========================================
# Development
# ==========================================

# Build all packages
build:
    turbo run build

# Watch mode for development
dev:
    turbo run dev

# Install dependencies
install:
    npm install

# ==========================================
# Quality Assurance
# ==========================================

# Run all quality checks (lint, types, build, test)
qa:
    turbo run lint check-types build test

# Run ESLint
lint:
    turbo run lint

# Run TypeScript type checking
check-types:
    turbo run check-types

# Run all tests
test:
    turbo run test

# Run Prettier formatting
format:
    npm run format

# ==========================================
# Package-specific Commands
# ==========================================

# Run forma-core tests in watch mode
test-core-watch:
    cd packages/forma-core && npm run test:watch

# Run forma-react tests in watch mode
test-react-watch:
    cd packages/forma-react && npm run test:watch

# Run forma-react tests with coverage
test-react-coverage:
    cd packages/forma-react && npm run test:coverage

# ==========================================
# Maintenance
# ==========================================

# Clean turbo cache and build artifacts
clean:
    rm -rf .turbo node_modules/.cache
    turbo run clean

# Full clean including node_modules
clean-all:
    rm -rf .turbo node_modules
    rm -rf packages/*/node_modules packages/*/dist
