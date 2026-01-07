# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forma is a declarative form specification language with FEEL (Friendly Enough Expression Language) expressions for dynamic form behavior. It's a TypeScript monorepo using Turborepo with two main packages:

- **@fogpipe/forma-core** - Core runtime library for form validation, visibility, required states, and FEEL evaluation
- **@fogpipe/forma-react** - React integration with hooks and components

## Commands

```bash
# Root level (runs across all packages via Turbo)
npm run build          # Build all packages
npm run dev            # Watch mode for development
npm run lint           # ESLint
npm run check-types    # TypeScript type checking
npm run test           # Run all tests
npm run format         # Prettier formatting

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

## Code Conventions

- Test files colocated with source: `foo.ts` → `foo.test.ts`
- TypeScript strict mode enabled
- Conventional Commits for commit messages (feat:, fix:, docs:, etc.)
- Branch names: `feat/name`, `fix/name`, etc.

## Publishing

Releases are triggered by version tags. Maintainers tag with `git tag v1.0.0` and push to trigger the publish workflow to GitHub Packages.
