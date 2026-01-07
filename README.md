# Forma

Declarative form specification with FEEL expressions for dynamic behavior.

Forma is a specification language for defining dynamic forms that combines JSON Schema-like field definitions with [FEEL (Friendly Enough Expression Language)](https://docs.camunda.io/docs/components/modeler/feel/what-is-feel/) expressions for conditional logic.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [@formidable/forma-core](./packages/forma-core) | Core runtime: types, FEEL evaluation, form state engines | [![npm](https://img.shields.io/npm/v/@formidable/forma-core)](https://www.npmjs.com/package/@formidable/forma-core) |
| [@formidable/forma-react](./packages/forma-react) | Headless React form renderer | [![npm](https://img.shields.io/npm/v/@formidable/forma-react)](https://www.npmjs.com/package/@formidable/forma-react) |

## Features

- **Declarative Forms** - Define form structure and behavior in JSON
- **FEEL Expressions** - Human-readable conditional logic for visibility, required state, and validation
- **Computed Fields** - Derived values calculated from form data
- **Multi-Page Wizards** - Built-in support for wizard-style forms
- **Headless Architecture** - Bring your own UI components
- **Type Safety** - Full TypeScript support

## Quick Start

### Installation

```bash
# Core runtime (required)
npm install @formidable/forma-core

# React integration (optional)
npm install @formidable/forma-react
```

### Define a Form

```typescript
import type { Forma } from '@formidable/forma-core';

const registrationForm: Forma = {
  meta: {
    title: "User Registration",
    description: "Create a new account"
  },
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email Address",
      required: true
    },
    {
      id: "age",
      type: "integer",
      label: "Age",
      required: true,
      min: 18,
      max: 120
    },
    {
      id: "hasLicense",
      type: "boolean",
      label: "Do you have a driver's license?",
      // Only show if user is 16 or older
      visible: "age >= 16"
    },
    {
      id: "licenseNumber",
      type: "text",
      label: "License Number",
      // Required only if user has a license
      required: "hasLicense = true",
      // Only visible if user has a license
      visible: "hasLicense = true"
    }
  ],
  computed: [
    {
      name: "isAdult",
      expression: "age >= 18",
      label: "Adult Status"
    }
  ]
};
```

### Render with React

```tsx
import { FormRenderer } from '@formidable/forma-react';
import { myComponents } from './components';

function App() {
  return (
    <FormRenderer
      spec={registrationForm}
      components={myComponents}
      onSubmit={(data) => console.log('Submitted:', data)}
    />
  );
}
```

### Use the Core Runtime Directly

```typescript
import {
  getVisibility,
  getRequired,
  validate,
  calculate
} from '@formidable/forma-core';

const formData = {
  email: "user@example.com",
  age: 25,
  hasLicense: true,
  licenseNumber: "ABC123"
};

// Check which fields are visible
const visibility = getVisibility(formData, registrationForm);
// { email: true, age: true, hasLicense: true, licenseNumber: true }

// Check which fields are required
const required = getRequired(formData, registrationForm);
// { email: true, age: true, hasLicense: false, licenseNumber: true }

// Calculate computed values
const computed = calculate(formData, registrationForm);
// { isAdult: true }

// Validate the form
const result = validate(formData, registrationForm);
// { valid: true, errors: [] }
```

## FEEL Expression Examples

Forma uses FEEL expressions for dynamic behavior:

```typescript
// Visibility - show field conditionally
{ visible: "age >= 18" }
{ visible: "country = \"US\"" }
{ visible: "items.length > 0" }

// Required - make field required conditionally
{ required: "hasInsurance = true" }
{ required: "orderTotal > 100" }

// Computed fields - calculate values
{ expression: "quantity * unitPrice" }
{ expression: "if income > 50000 then \"premium\" else \"standard\"" }

// Validation rules
{
  validation: [
    { rule: "value >= 0", message: "Must be positive" },
    { rule: "value <= 100", message: "Cannot exceed 100" }
  ]
}
```

## Documentation

- [forma-core README](./packages/forma-core/README.md) - Core runtime API
- [forma-react README](./packages/forma-react/README.md) - React integration guide

## Development

### Prerequisites

- Node.js >= 18
- npm >= 11

### Setup

```bash
# Clone the repository
git clone https://github.com/fogpipe/forma.git
cd forma

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

### Commands

```bash
npm run dev          # Start development mode
npm run build        # Build all packages
npm run lint         # Run ESLint
npm run check-types  # Run TypeScript checks
npm run test         # Run tests
npm run format       # Format code with Prettier
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE)
