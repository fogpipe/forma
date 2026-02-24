# Contributing to Forma

Thank you for your interest in contributing to Forma! This document provides guidelines and information about contributing to this project.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 11

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/forma.git
   cd forma
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build all packages:
   ```bash
   npm run build
   ```
5. Run tests to verify setup:
   ```bash
   npm run test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feat/add-date-range-field` - New features
- `fix/validation-error-message` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/simplify-evaluate` - Code refactoring

### Making Changes

1. Create a new branch from `main`
2. Make your changes
3. Ensure all checks pass:
   ```bash
   npm run lint
   npm run check-types
   npm run build
   npm run test
   ```
4. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
5. Push your branch and open a Pull Request

### Commit Messages

We use Conventional Commits:

```
feat: add support for date range fields
fix: correct validation message for required fields
docs: update FEEL expression examples
refactor: simplify visibility evaluation logic
test: add tests for array field helpers
```

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

### Pull Requests

- Provide a clear description of the changes
- Reference any related issues
- Ensure CI checks pass
- Request review from maintainers

## Project Structure

```
forma/
├── packages/
│   ├── forma-core/           # Core runtime
│   │   ├── src/
│   │   │   ├── types.ts      # Type definitions
│   │   │   ├── feel/         # FEEL expression evaluation
│   │   │   └── engine/       # Form state engines
│   │   └── package.json
│   ├── forma-react/          # React integration
│   │   ├── src/
│   │   │   ├── useForma.ts   # Main hook
│   │   │   ├── FormRenderer.tsx
│   │   │   └── types.ts
│   │   └── package.json
│   ├── typescript-config/    # Shared TS configs
│   └── eslint-config/        # Shared ESLint configs
├── .github/workflows/        # CI/CD
├── package.json              # Root package
└── turbo.json               # Turborepo config
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests for specific package
cd packages/forma-core && npm run test
```

### Writing Tests

- Place tests next to source files: `foo.ts` → `foo.test.ts`
- Use descriptive test names
- Test edge cases and error conditions
- Aim for good coverage of public APIs

## Code Style

- We use Prettier for formatting
- ESLint for linting
- TypeScript strict mode

Run formatters before committing:

```bash
npm run format
npm run lint
```

## Releasing

Releases are managed by maintainers through git tags:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the publish workflow which:

1. Runs all quality checks
2. Updates package versions
3. Publishes to npm

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

Thank you for contributing!
