# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forma is a declarative form specification language with FEEL (Friendly Enough Expression Language) expressions for dynamic form behavior. It's a TypeScript monorepo using Turborepo with two main packages:

- **@fogpipe/forma-core** - Core runtime library for form validation, visibility, required states, and FEEL evaluation
- **@fogpipe/forma-react** - React integration with hooks and components (depends on forma-core)

## Important: Verify Changes

**VERY IMPORTANT:** After making any code modifications, always run quality checks to verify everything works:

```bash
turbo run lint check-types build test
```

Do this immediately after changes - don't wait until the end. Fix any issues before proceeding.

## Commands

```bash
# Root level (runs across all packages via Turbo)
turbo run build        # Build all packages
turbo run dev          # Watch mode for development
turbo run lint         # ESLint
turbo run check-types  # TypeScript type checking
turbo run test         # Run all tests
npm run format         # Prettier formatting (not a turbo task)

# Package level (run from packages/forma-core or packages/forma-react)
npm run test:watch     # Run tests in watch mode

# forma-react only
npm run test:coverage  # Run tests with coverage
```

## Architecture

### Package Structure

```
packages/
├── forma-core/           # Core runtime (ESM + CommonJS)
│   ├── src/types.ts      # Form specification types (Forma, FieldDefinition, etc.)
│   ├── src/feel/         # FEEL expression evaluation (uses feelin library)
│   └── src/engine/       # Form state engines (visibility, required, enabled, calculate, validate)
├── forma-react/          # React integration (ESM only)
│   ├── src/useForma.ts   # Main hook for form state management
│   ├── src/FormRenderer.tsx  # Declarative form rendering component
│   └── src/context.ts    # React context for form state
├── typescript-config/    # Shared TypeScript configs
└── eslint-config/        # Shared ESLint configs
```

### Package Dependencies

```
@fogpipe/forma-react
    └── depends on: @fogpipe/forma-core

@fogpipe/forma-core
    └── depends on: feelin (FEEL expression parser)
```

When making changes to forma-core that affect forma-react, ensure both packages build successfully.

### Entry Points

forma-core exports three entry points:

- `@fogpipe/forma-core` - Main exports (types + engines + FEEL)
- `@fogpipe/forma-core/engine` - Engine functions only
- `@fogpipe/forma-core/feel` - FEEL evaluation only

### Form Engines

The core package has five engines that compute form state:

1. **Visibility** - Which fields to show (evaluates `visible` expressions)
2. **Required** - Conditional required state (evaluates `required` expressions)
3. **Enabled** - Conditional enabled/disabled state
4. **Calculate** - Computed field values from expressions
5. **Validate** - Validation against rules

### FEEL Expression Context

FEEL expressions have access to:

- `data` - Current form data
- `computed` - Computed field values
- `ref` - Reference to another field's value
- `item` / `itemIndex` - Array iteration context
- `value` - Current field value

## Quality Checks

**Always run before committing:**

```bash
turbo run lint check-types build test
```

This runs all quality checks across the monorepo with proper caching. All checks must pass before merging.

## Git Workflow

### Conventional Commits

All commits must follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]
```

**Types:**

- `feat:` - New feature (triggers MINOR version bump)
- `fix:` - Bug fix (triggers PATCH version bump)
- `docs:` - Documentation only changes
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests
- `chore:` - Build, CI, dependencies, tooling

**Breaking Changes:**

- Add `!` after type: `feat!: remove deprecated API`
- Triggers MAJOR version bump

**Examples:**

```bash
git commit -m "feat: add date picker field type"
git commit -m "fix: correct validation message for required fields"
git commit -m "feat!: change API response format"
```

### Branch Names

Use descriptive branch names:

- `feat/add-date-field` - New features
- `fix/validation-error` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/simplify-engine` - Code refactoring

## Releases

Use the `/release` command to create a new release. This will:

1. Check prerequisites (git status, branch, etc.)
2. Run all quality checks
3. Analyze commits since last release
4. Determine semantic version bump
5. Update all package.json versions
6. Create git tag and GitHub release
7. Trigger the publish workflow to GitHub Packages

The publish workflow automatically:

- Runs quality checks
- Publishes @fogpipe/forma-core
- Publishes @fogpipe/forma-react

## Troubleshooting

### Build Failures

If `turbo run build` fails:

1. Check TypeScript errors: `turbo run check-types`
2. Ensure dependencies are installed: `npm install`
3. Clear Turbo cache: `rm -rf .turbo node_modules/.cache`

### TypeScript Errors in forma-react

forma-react depends on forma-core types. If you see type errors:

1. Ensure forma-core builds first: `cd packages/forma-core && npm run build`
2. Then build forma-react: `cd packages/forma-react && npm run build`

Or just run `turbo run build` at root - Turbo handles the order.

### Test Failures

Run tests in watch mode for faster iteration:

```bash
cd packages/forma-core
npm run test:watch
```
