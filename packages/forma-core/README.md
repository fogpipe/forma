# @fogpipe/forma-core

Core runtime for Forma - a declarative form specification with FEEL expressions for dynamic behavior.

## Installation

```bash
npm install @fogpipe/forma-core
```

## Features

- **Type Definitions** - Complete TypeScript types for Forma specifications
- **FEEL Evaluation** - Evaluate FEEL expressions in form context
- **Visibility Engine** - Determine which fields should be visible
- **Required Engine** - Evaluate conditional required state
- **Enabled Engine** - Evaluate conditional enabled/disabled state
- **Calculation Engine** - Compute derived field values
- **Validation Engine** - Validate form data against rules

## Usage

### Define a Forma Specification

```typescript
import type { Forma } from "@fogpipe/forma-core";

const form: Forma = {
  meta: {
    title: "Contact Form",
  },
  fields: [
    {
      id: "name",
      type: "text",
      label: "Full Name",
      required: true,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: true,
    },
    {
      id: "phone",
      type: "text",
      label: "Phone Number",
      // Only required if email is not provided
      required: 'email = null or email = ""',
    },
  ],
};
```

### Evaluate Form State

```typescript
import {
  getVisibility,
  getRequired,
  getEnabled,
  validate,
  calculate,
} from "@fogpipe/forma-core";

const data = { name: "John", email: "john@example.com" };

// Get visibility state for all fields
const visibility = getVisibility(data, form);

// Get required state for all fields
const required = getRequired(data, form);

// Get enabled state for all fields
const enabled = getEnabled(data, form);

// Validate form data
const result = validate(data, form);
if (!result.valid) {
  console.log("Errors:", result.errors);
}

// Calculate computed values
const computed = calculate(data, form);
```

### FEEL Expression Evaluation

```typescript
import { evaluate, evaluateBoolean } from "@fogpipe/forma-core/feel";

const context = {
  data: { age: 25, country: "US" },
};

// Evaluate any expression
const result = evaluate<number>("age * 2", context);
if (result.success) {
  console.log(result.value); // 50
}

// Evaluate boolean expression
const isAdult = evaluateBoolean("age >= 18", context); // true
```

## API Reference

### Types

- `Forma` - Complete form specification
- `FieldDefinition` - Field definition
- `ComputedField` - Computed field definition
- `PageDefinition` - Page definition for wizards
- `FieldError` - Validation error
- `ValidationResult` - Validation result

### Engine Functions

#### Visibility

```typescript
getVisibility(data, spec, options?) → Record<string, boolean>
isFieldVisible(fieldId, data, spec, options?) → boolean
getPageVisibility(data, spec, options?) → Record<string, boolean>
```

#### Required

```typescript
getRequired(data, spec, options?) → Record<string, boolean>
isRequired(fieldId, data, spec, options?) → boolean
```

#### Enabled

```typescript
getEnabled(data, spec, options?) → Record<string, boolean>
isEnabled(fieldId, data, spec, options?) → boolean
```

#### Validation

```typescript
validate(data, spec, options?) → ValidationResult
validateSingleField(fieldId, value, data, spec, options?) → FieldError[]
```

#### Calculation

```typescript
calculate(data, spec, options?) → Record<string, unknown>
calculateWithErrors(data, spec, options?) → CalculationResult
calculateField(fieldName, data, spec, existingComputed?, options?) → unknown
```

### FEEL Functions

```typescript
evaluate<T>(expression, context) → EvaluationOutcome<T>
evaluateBoolean(expression, context) → boolean
evaluateNumber(expression, context) → number | null
evaluateString(expression, context) → string | null
isValidExpression(expression) → boolean
```

## License

MIT
