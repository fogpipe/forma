---
status: Done
priority: High
depends_on: []
related: []
---

# Forma Spec UI Layer Extension

Extend the Forma specification with presentation variants, display fields, appearance adorners, and readonly expression support. Refactor `FieldDefinition` from a flat interface to a **discriminated union** for compile-time type safety. These are type and renderer changes across both `@fogpipe/forma-core` and `@fogpipe/forma-react`.

## Overview

The Forma spec is currently data-focused - it defines what data to collect and how to validate it. This task adds the **presentation layer** to the spec itself, enabling forms with visual hierarchy, computed result display, input decoration, and readonly states.

**Research basis:**

- `formidable/docs/research/forma-ui-layer-analysis.md` (type vs variant design)
- `formidable/docs/research/form-js-deep-dive.md` (competitive gap analysis vs bpmn-io/form-js)

**Design principle:** Semantic types define what data is collected. Variants define how it's rendered. Same data, different UX = variant. Different data = different type.

---

## 1. Type System Refactor (`@fogpipe/forma-core`)

### 1.1 Breaking Change: `type` Becomes Required

Currently `type` is optional on `FieldDefinition` (inferred from JSON Schema). This changes to **required** so TypeScript can use it as a discriminant for the union.

**Rationale:**

- The AI always generates `type` explicitly
- Inference-from-schema adds runtime complexity for unclear benefit
- Required `type` enables compile-time enforcement of which properties are valid on which field types
- No external consumers yet, so backwards compatibility is not a concern

### 1.2 Discriminated Union Architecture

Replace the flat `FieldDefinition` interface with a grouped discriminated union. Fields are grouped by shared capabilities (7 union members instead of 16+ individual types):

File: `packages/forma-core/src/types.ts`

```typescript
// ============================================================================
// Base Field Definition (shared by all field types)
// ============================================================================

/**
 * Base properties shared by all field types
 */
interface FieldDefinitionBase {
  /** Field type - REQUIRED, used as discriminant for the union */
  type: FieldType;
  /** Display label */
  label?: string;
  /** Help text or description */
  description?: string;
  /** Placeholder text for input fields */
  placeholder?: string;

  // Conditional logic (all FEEL expressions)

  /** When to show this field. If omitted, always visible. */
  visibleWhen?: FEELExpression;
  /** When this field is required. If omitted, uses schema required. */
  requiredWhen?: FEELExpression;
  /** When this field is editable. If omitted, always enabled. */
  enabledWhen?: FEELExpression;
  /** When this field is read-only (visible, not editable, value still submitted). */
  readonlyWhen?: FEELExpression;

  // Validation

  /** Custom validation rules using FEEL expressions */
  validations?: ValidationRule[];

  // Presentation

  /** Presentation variant hint (e.g., "slider", "radio", "nps") */
  variant?: string;
  /** Variant-specific configuration */
  variantConfig?: Record<string, unknown>;
}

// ============================================================================
// Field Type Groups
// ============================================================================

/**
 * Text-like and numeric input fields that support prefix/suffix adorners.
 *
 * Adorners are cross-variant: a "$" prefix applies to input, stepper,
 * and slider variants alike. That's why they're top-level properties
 * rather than inside variantConfig.
 */
interface AdornableFieldDefinition extends FieldDefinitionBase {
  type:
    | "text"
    | "email"
    | "url"
    | "password"
    | "textarea"
    | "number"
    | "integer";
  /** Text/symbol displayed before input (e.g., "$", "https://") */
  prefix?: string;
  /** Text/symbol displayed after input (e.g., "USD", "kg", "%") */
  suffix?: string;
}

/**
 * Selection fields that have options.
 */
interface SelectionFieldDefinition extends FieldDefinitionBase {
  type: "select" | "multiselect";
  /** Available options for selection */
  options?: SelectOption[];
}

/**
 * Simple fields with no type-specific properties beyond the base.
 */
interface SimpleFieldDefinition extends FieldDefinitionBase {
  type: "boolean" | "date" | "datetime";
}

/**
 * Array fields with item field definitions and count constraints.
 */
interface ArrayFieldDefinition extends FieldDefinitionBase {
  type: "array";
  /** Field definitions for each array item. Use `item.fieldName` in FEEL. */
  itemFields?: Record<string, FieldDefinition>;
  /** Minimum number of items (overrides schema) */
  minItems?: number;
  /** Maximum number of items (overrides schema) */
  maxItems?: number;
}

/**
 * Object fields (nested grouping).
 */
interface ObjectFieldDefinition extends FieldDefinitionBase {
  type: "object";
}

/**
 * Display-only fields for presentation content and computed output.
 * Collect no data - excluded from JSON Schema, validation, and submission.
 *
 * Omits properties that are meaningless on display fields:
 * readonlyWhen, validations, requiredWhen, enabledWhen, placeholder.
 */
interface DisplayFieldDefinition extends Omit<
  FieldDefinitionBase,
  | "readonlyWhen"
  | "validations"
  | "requiredWhen"
  | "enabledWhen"
  | "placeholder"
> {
  type: "display";
  /** Static content (plain text or markdown). For text, heading, alert, callout. */
  content?: string;
  /** Data source for dynamic display (e.g., "computed.totalPrice"). For metric, alert, summary. */
  source?: string;
  /** Display format (e.g., "currency", "percent", "decimal(2)", or template "{value} Nm") */
  format?: string;
}

/**
 * Computed fields (read-only calculated values).
 * Note: Computed field definitions live in Forma.computed, not Forma.fields.
 * This type exists for completeness if computed fields appear in the fields map.
 */
interface ComputedFieldDefinition extends FieldDefinitionBase {
  type: "computed";
}

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Field definition - discriminated union on `type`.
 *
 * Use type narrowing to access type-specific properties:
 *
 * @example
 * if (field.type === "number") {
 *   field.prefix;  // ✅ string | undefined
 * }
 * if (field.type === "display") {
 *   field.content; // ✅ string | undefined
 *   field.prefix;  // ❌ compile error - not on display fields
 * }
 * if (field.type === "select") {
 *   field.options; // ✅ SelectOption[] | undefined
 * }
 */
type FieldDefinition =
  | AdornableFieldDefinition
  | SelectionFieldDefinition
  | SimpleFieldDefinition
  | ArrayFieldDefinition
  | ObjectFieldDefinition
  | DisplayFieldDefinition
  | ComputedFieldDefinition;
```

### 1.3 Type Group Summary

| Group         | Types                                                 | Unique properties                                                                                                 |
| ------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Adornable** | text, email, url, password, textarea, number, integer | `prefix`, `suffix`                                                                                                |
| **Selection** | select, multiselect                                   | `options`                                                                                                         |
| **Simple**    | boolean, date, datetime                               | (none beyond base)                                                                                                |
| **Array**     | array                                                 | `itemFields`, `minItems`, `maxItems`                                                                              |
| **Object**    | object                                                | (none beyond base)                                                                                                |
| **Display**   | display                                               | `content`, `source`, `format`. Omits: `readonlyWhen`, `validations`, `requiredWhen`, `enabledWhen`, `placeholder` |
| **Computed**  | computed                                              | (none beyond base)                                                                                                |

### 1.4 Type Guard Helpers

Export convenience type guards for common narrowing patterns:

```typescript
/** Check if field supports prefix/suffix adorners */
function isAdornableField(
  field: FieldDefinition,
): field is AdornableFieldDefinition {
  return [
    "text",
    "email",
    "url",
    "password",
    "textarea",
    "number",
    "integer",
  ].includes(field.type);
}

/** Check if field is a display-only field (no data) */
function isDisplayField(
  field: FieldDefinition,
): field is DisplayFieldDefinition {
  return field.type === "display";
}

/** Check if field is a selection field (has options) */
function isSelectionField(
  field: FieldDefinition,
): field is SelectionFieldDefinition {
  return field.type === "select" || field.type === "multiselect";
}

/** Check if field is an array field */
function isArrayField(field: FieldDefinition): field is ArrayFieldDefinition {
  return field.type === "array";
}

/** Check if field collects data (not display) */
function isDataField(field: FieldDefinition): boolean {
  return field.type !== "display";
}
```

### 1.5 Updated `FieldType` Union

```typescript
export type FieldType =
  | "text"
  | "password"
  | "number"
  | "integer"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "textarea"
  | "array"
  | "object"
  | "computed"
  | "display"; // NEW
```

---

## 2. Readonly Engine

### 2.1 New Engine Module

New file: `packages/forma-core/src/engine/readonly.ts`

Follows the same pattern as `visibility.ts` and `enabled.ts`:

```typescript
/**
 * Evaluate readonlyWhen expressions for all fields.
 * Returns a map of field paths to boolean readonly states.
 * Fields without readonlyWhen are never readonly.
 * Display fields are skipped (readonlyWhen is omitted from their type).
 */
export function evaluateReadonly(
  data: Record<string, unknown>,
  forma: Forma,
  options?: {
    referenceData?: Record<string, unknown>;
    computed?: Record<string, unknown>;
  },
): Record<string, boolean>;

/**
 * Evaluate readonlyWhen for a single field (including array item context).
 */
export function evaluateFieldReadonly(
  fieldDef: FieldDefinition,
  context: EvaluationContext,
): boolean;
```

### 2.2 Semantic Distinction: `readonlyWhen` vs `enabledWhen`

These serve different UX purposes:

| Property               | Visual state                      | Can interact? | Data submitted?           | Use case                                          |
| ---------------------- | --------------------------------- | ------------- | ------------------------- | ------------------------------------------------- |
| `enabledWhen: "false"` | Greyed out / dimmed               | No            | No (typically excluded)   | Field not applicable in this context              |
| `readonlyWhen: "true"` | Normal appearance, no edit cursor | No            | **Yes** (value preserved) | Showing pre-filled data the user shouldn't change |

Example: An insurance form where the policy number is pre-filled and readonly, but the user can still see and submit it. vs. a "spouse details" section that's disabled entirely when `maritalStatus != "married"`.

---

## 3. Display Field Variants

The `display` type supports these variants:

### 3.1 Static Content Variants

| Variant          | Purpose                      | Key properties                                                  | Rendering                   |
| ---------------- | ---------------------------- | --------------------------------------------------------------- | --------------------------- |
| `text` (default) | Paragraph text, instructions | `content` (markdown)                                            | Rendered markdown paragraph |
| `heading`        | Section header               | `content`, `variantConfig.level` (1-4)                          | `<h2>`-`<h5>` element       |
| `divider`        | Horizontal rule              | none                                                            | `<hr>` element              |
| `spacer`         | Vertical whitespace          | `variantConfig.height` (sm/md/lg)                               | Empty `<div>` with height   |
| `image`          | Static image                 | `content` (URL), `variantConfig.alt`, `variantConfig.maxHeight` | `<img>` element             |

### 3.2 Dynamic Display Variants (Computed Output)

| Variant        | Purpose               | Key properties                                                               | Rendering                         |
| -------------- | --------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| `metric`       | Single computed value | `source`, `format`, `variantConfig.unit`, `.size`, `.highlight`              | Card with label + formatted value |
| `metric-range` | Min/max range         | `source`, `variantConfig.minLabel`, `.maxLabel`, `.unit`, `.showBar`         | Range visualization               |
| `alert`        | Warning/info message  | `source` or `content`, `variantConfig.severity` (info/warning/error/success) | Colored alert box                 |
| `callout`      | Highlighted info      | `source` or `content`, `variantConfig.icon`                                  | Bordered callout section          |
| `summary`      | Key-value pairs       | `source` (object or array)                                                   | Structured list/table             |

### 3.3 Display Field Examples

**Static content:**

```json
{
  "instructions": {
    "type": "display",
    "variant": "text",
    "content": "Please fill in your details below. Fields marked with * are required."
  },
  "sectionBreak": {
    "type": "display",
    "variant": "divider"
  },
  "contactHeader": {
    "type": "display",
    "variant": "heading",
    "content": "Contact Information",
    "variantConfig": { "level": 2 }
  }
}
```

**Dynamic computed output:**

```json
{
  "totalPrice": {
    "type": "display",
    "label": "Total Price",
    "source": "computed.totalPrice",
    "variant": "metric",
    "variantConfig": {
      "unit": "USD",
      "size": "lg",
      "highlight": true
    }
  },
  "warningMessage": {
    "type": "display",
    "source": "computed.warningText",
    "variant": "alert",
    "variantConfig": { "severity": "warning" }
  }
}
```

---

## 4. Appearance Adorners

### 4.1 Design Decision: Why Top-Level, Not `variantConfig`

Adorners are **cross-variant** - a `$` prefix applies equally to `variant: "input"`, `variant: "stepper"`, and `variant: "slider"` for a number field. They're a property of the field itself, not a variant-specific detail. Putting them in `variantConfig` would:

- Lose type safety (variantConfig is `Record<string, unknown>`)
- Require duplicating them across variant configs
- Break the principle: "variantConfig is for variant-specific settings"

### 4.2 Spec Examples

```json
{
  "price": {
    "type": "number",
    "label": "Price",
    "prefix": "$",
    "suffix": "USD"
  },
  "weight": {
    "type": "number",
    "label": "Weight",
    "suffix": "kg"
  },
  "website": {
    "type": "url",
    "label": "Website",
    "prefix": "https://"
  },
  "email": {
    "type": "email",
    "label": "Email",
    "suffix": "@company.com"
  }
}
```

### 4.3 Type Safety

With the discriminated union, adorners are **compile-time enforced**:

```typescript
// ✅ Compiles - number is an adornable type
const price: AdornableFieldDefinition = {
  type: "number",
  label: "Price",
  prefix: "$",
};

// ❌ Compile error - boolean has no prefix property
const agree: SimpleFieldDefinition = {
  type: "boolean",
  label: "I agree",
  prefix: "$", // Property 'prefix' does not exist
};

// ❌ Compile error - display has no prefix property
const heading: DisplayFieldDefinition = {
  type: "display",
  content: "Title",
  prefix: "$", // Property 'prefix' does not exist
};
```

---

## 5. Renderer Changes (`@fogpipe/forma-react`)

### 5.1 New Props in `types.ts`

```typescript
// New component props for display fields
export interface DisplayFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  fieldType: "display";
  /** Static content (markdown/text) */
  content?: string;
  /** Computed source value (resolved by useForma) */
  sourceValue?: unknown;
  /** Display variant */
  variant?: string;
  /** Variant config */
  variantConfig?: Record<string, unknown>;
  /** Format string */
  format?: string;
  /** No onChange - display fields are read-only */
  onChange?: never;
}

export interface DisplayComponentProps {
  field: DisplayFieldProps;
  spec: Forma;
}
```

Add to `BaseFieldProps`:

```typescript
export interface BaseFieldProps {
  // ...existing...

  /** Prefix adorner text (e.g., "$") */
  prefix?: string;

  /** Suffix adorner text (e.g., "kg") */
  suffix?: string;

  /** Whether field is readonly (visible, not editable, value submitted) */
  readonly: boolean;
}
```

Add to `ComponentMap`:

```typescript
export interface ComponentMap {
  // ...existing...
  display?: React.ComponentType<DisplayComponentProps>;
}
```

Add to `FieldProps` union:

```typescript
export type FieldProps =
  // ...existing...
  DisplayFieldProps;
```

### 5.2 Changes to `useForma.ts`

The `useForma` hook needs to:

1. **Evaluate `readonlyWhen` expressions** alongside visibility and enabled, and expose `readonly` in field props
2. **Resolve `source` for display fields** - look up `computed.fieldName` values and pass as `sourceValue`
3. **Pass `prefix`/`suffix`** from field definition through to component props (only for adornable types)
4. **Pass `variant`/`variantConfig`** through to component props
5. **Skip display fields in validation** - `type: "display"` fields collect no data
6. **Skip display fields in submission data** - exclude from `getData()` result

### 5.3 Changes to `FormRenderer`

The `FormRenderer` component needs to:

1. **Route `display` type to the display component** in the component map
2. **Not render field wrappers for certain display variants** (divider, spacer don't need label/error wrappers)

---

## 6. JSON Schema Implications

Fields with `type: "display"` should **NOT** appear in `schema.properties` since they collect no data. The spec structure:

```json
{
  "schema": {
    "properties": {
      "name": { "type": "string" }
    }
  },
  "fields": {
    "instructions": { "type": "display", "content": "Fill in your name" },
    "name": { "type": "text", "label": "Name" }
  },
  "fieldOrder": ["instructions", "name"]
}
```

`instructions` exists in `fields` and `fieldOrder` but not in `schema.properties`.

---

## 7. Validation Changes

### 7.1 Forma Spec Validation

Update structural validation to:

- Allow `display` fields without a corresponding `schema.properties` entry
- Validate that `display` fields have either `content` or `source` (or a self-sufficient variant like `divider`/`spacer`)
- Validate that `source` references valid computed field paths (e.g., `computed.fieldName`)
- The discriminated union handles adorner/option type restrictions at compile time, but runtime validation (Zod schemas in `@formidable/forma`) should also enforce these constraints

### 7.2 Zod Schema Alignment

The Zod validation schema in `@formidable/forma` (the Formidable-specific validation layer) needs to be updated to match the discriminated union. This is covered in the Formidable task (`formidable/docs/tasks/forma-ui-layer-implementation.md`).

---

## 8. Implementation Plan

### Phase 1: Type System Refactor

1. **Refactor `FieldDefinition`** in `packages/forma-core/src/types.ts`
   - Create `FieldDefinitionBase` interface
   - Create grouped interfaces: `AdornableFieldDefinition`, `SelectionFieldDefinition`, `SimpleFieldDefinition`, `ArrayFieldDefinition`, `ObjectFieldDefinition`, `DisplayFieldDefinition`, `ComputedFieldDefinition`
   - Create `FieldDefinition` discriminated union
   - Add `"display"` to `FieldType` union
   - Export all group interfaces and type guards
   - Make `type` required (was optional)

2. **Fix all internal usages** of `FieldDefinition`
   - Update engine modules (`visibility.ts`, `enabled.ts`, `required.ts`, `validate.ts`, `calculate.ts`) to handle the union
   - Use type guards where type-specific properties are accessed
   - Update any code that relies on `type` being optional

3. **Verify all tests pass** after the type refactor (before adding new features)

### Phase 2: Readonly Engine

4. **Create `readonly.ts` engine** in `packages/forma-core/src/engine/`
   - `evaluateReadonly()` and `evaluateFieldReadonly()`
   - Follow exact pattern of `enabled.ts`
   - Skip display fields (readonlyWhen is omitted from their type)

5. **Export readonly engine** from `packages/forma-core/src/engine/index.ts`

6. **Add tests** for readonly evaluation in `packages/forma-core/src/__tests__/`

### Phase 3: Renderer Updates

7. **Update `types.ts`** in `packages/forma-react/src/`
   - Add `DisplayFieldProps`, `DisplayComponentProps`
   - Add `prefix`, `suffix`, `readonly` to `BaseFieldProps`
   - Add `display` to `ComponentMap`
   - Add `DisplayFieldProps` to `FieldProps` union

8. **Update `useForma.ts`** in `packages/forma-react/src/`
   - Evaluate `readonlyWhen` expressions
   - Resolve `source` values for display fields
   - Pass through `prefix`, `suffix`, `variant`, `variantConfig` (using type guards)
   - Exclude display fields from validation and submission data

9. **Update `FormRenderer`** (if applicable)
   - Handle `display` type routing
   - Skip field wrappers for divider/spacer variants

10. **Add tests** for new props passing and display field behavior

### Phase 4: Validation & Edge Cases

11. **Update any structural validation** in forma-core
    - Allow display fields without schema entries
    - Validate display field properties (content/source/self-sufficient variant)

12. **Test array context** - ensure `readonlyWhen` works with `item.fieldName` references inside array fields

13. **Run full QA** - `turbo run lint check-types build test`

---

## 9. Test Cases

### Type System

```typescript
// ✅ Adornable field with prefix
const price: FieldDefinition = {
  type: "number",
  label: "Price",
  prefix: "$",
  suffix: "USD",
};

// ✅ Display field with content
const heading: FieldDefinition = {
  type: "display",
  content: "Contact Info",
  variant: "heading",
};

// ✅ Select field with options
const country: FieldDefinition = {
  type: "select",
  label: "Country",
  options: [{ value: "US", label: "United States" }],
};

// ❌ Compile error: prefix not on display
const bad1: DisplayFieldDefinition = {
  type: "display",
  content: "Hi",
  prefix: "$",
};

// ❌ Compile error: options not on number
const bad2: AdornableFieldDefinition = {
  type: "number",
  label: "Age",
  options: [],
};

// ❌ Compile error: readonlyWhen not on display
const bad3: DisplayFieldDefinition = {
  type: "display",
  content: "Hi",
  readonlyWhen: "true",
};

// Type narrowing works
function example(field: FieldDefinition) {
  if (isAdornableField(field)) {
    field.prefix; // ✅ accessible
  }
  if (isDisplayField(field)) {
    field.content; // ✅ accessible
    field.prefix; // ❌ compile error
  }
}
```

### Readonly Engine

```typescript
// Basic readonlyWhen
{ type: "text", readonlyWhen: "status = \"submitted\"" }
// → readonly when status equals "submitted"

// Readonly with array item context
{ type: "text", readonlyWhen: "item.locked = true" }
// → readonly per-item in arrays

// No readonlyWhen = never readonly
{ type: "text", label: "Name" }
// → readonly: false always
```

### Display Fields

```typescript
// Static text
{ type: "display", content: "Instructions here" }
// → renders as paragraph

// Computed metric
{ type: "display", source: "computed.total", variant: "metric", variantConfig: { unit: "USD" } }
// → renders as metric card with resolved computed value

// Divider (no content or source needed)
{ type: "display", variant: "divider" }
// → renders as <hr>

// Display field excluded from submission data
// getData() should NOT include display fields
```

---

## 10. Breaking Changes

This is a **breaking change** release for `@fogpipe/forma-core`:

1. **`type` is now required** on `FieldDefinition` (was optional)
   - All existing Forma specs that omit `type` will need it added
   - Migration: add explicit `type` based on the corresponding `schema.properties` entry

2. **`FieldDefinition` is now a union** (was a single interface)
   - Code that accesses `field.options` without narrowing will get compile errors
   - Migration: use type guards (`isSelectionField(field)`) or check `field.type` before accessing type-specific properties

3. **Type-specific properties are restricted**
   - `prefix`/`suffix` only on adornable fields (was: any field, no compile error)
   - `options` only on selection fields (was: any field)
   - `itemFields`/`minItems`/`maxItems` only on array fields (was: any field)
   - Migration: existing specs are almost certainly already correct; only compile-time access patterns change

**Since we have no external consumers, these breaking changes are safe to ship.**

---

## 11. Success Criteria

- [ ] `FieldDefinition` is a discriminated union with 7 groups
- [ ] `type` is required on all field definitions
- [ ] Type guards exported: `isAdornableField`, `isDisplayField`, `isSelectionField`, `isArrayField`, `isDataField`
- [ ] `prefix`/`suffix` only compile on adornable fields
- [ ] `content`/`source`/`format` only compile on display fields
- [ ] `options` only compiles on selection fields
- [ ] `readonlyWhen` omitted from display fields at type level
- [ ] `FieldType` includes `"display"`
- [ ] `evaluateReadonly()` engine works with FEEL expressions (including array item context)
- [ ] `useForma` exposes `readonly`, `prefix`, `suffix` in field props
- [ ] `useForma` resolves `source` values for display fields from computed results
- [ ] Display fields excluded from validation and submission data
- [ ] `ComponentMap` includes `display` entry
- [ ] All existing tests updated and passing
- [ ] New tests cover: type narrowing, readonly engine, display fields, adorner pass-through
- [ ] `turbo run lint check-types build test` passes
