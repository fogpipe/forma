# @formidable/forma-react

Headless React form renderer for Forma specifications.

## Installation

```bash
npm install @formidable/forma-core @formidable/forma-react
```

## Features

- **Headless Architecture** - Bring your own UI components
- **useForma Hook** - Complete form state management
- **FormRenderer Component** - Declarative form rendering
- **Multi-Page Support** - Built-in wizard navigation
- **Type Safety** - Full TypeScript support

## Quick Start

### 1. Define Your Components

```tsx
import type { ComponentMap, TextFieldProps, BooleanFieldProps } from '@formidable/forma-react';

const TextInput = ({ field, value, onChange, onBlur, errors }: TextFieldProps) => (
  <div>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.placeholder}
    />
    {errors.map((e, i) => <span key={i} className="error">{e.message}</span>)}
  </div>
);

const Checkbox = ({ field, value, onChange }: BooleanFieldProps) => (
  <label>
    <input
      type="checkbox"
      checked={value || false}
      onChange={(e) => onChange(e.target.checked)}
    />
    {field.label}
  </label>
);

const components: ComponentMap = {
  text: TextInput,
  email: TextInput,
  boolean: Checkbox,
  // ... more components
};
```

### 2. Render the Form

```tsx
import { FormRenderer } from '@formidable/forma-react';
import type { Forma } from '@formidable/forma-core';

const myForm: Forma = {
  meta: { title: "Contact Us" },
  fields: [
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "subscribe", type: "boolean", label: "Subscribe to newsletter" }
  ]
};

function App() {
  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Submitted:', data);
  };

  return (
    <FormRenderer
      spec={myForm}
      components={components}
      onSubmit={handleSubmit}
    />
  );
}
```

## useForma Hook

For custom rendering, use the `useForma` hook directly:

```tsx
import { useForma } from '@formidable/forma-react';

function CustomForm({ spec }: { spec: Forma }) {
  const {
    data,
    errors,
    visibility,
    required,
    isValid,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    submitForm,
  } = useForma({
    spec,
    onSubmit: (data) => console.log(data)
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
      {spec.fields.map(field => {
        if (!visibility[field.id]) return null;

        return (
          <div key={field.id}>
            <label>{field.label}</label>
            <input
              value={String(data[field.id] || '')}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              onBlur={() => setFieldTouched(field.id)}
            />
          </div>
        );
      })}

      <button type="submit" disabled={isSubmitting || !isValid}>
        Submit
      </button>
    </form>
  );
}
```

## Multi-Page Forms (Wizard)

```tsx
function WizardForm({ spec }: { spec: Forma }) {
  const forma = useForma({ spec, onSubmit: handleSubmit });
  const { wizard } = forma;

  if (!wizard) return <div>Not a wizard form</div>;

  return (
    <div>
      {/* Page indicator */}
      <div>Page {wizard.currentPageIndex + 1} of {wizard.pages.length}</div>

      {/* Current page fields */}
      {wizard.currentPage?.fields.map(fieldId => {
        const field = spec.fields.find(f => f.id === fieldId);
        if (!field) return null;
        // Render field...
      })}

      {/* Navigation */}
      <button onClick={wizard.previousPage} disabled={!wizard.hasPreviousPage}>
        Previous
      </button>

      {wizard.isLastPage ? (
        <button onClick={forma.submitForm}>Submit</button>
      ) : (
        <button onClick={wizard.nextPage} disabled={!wizard.canProceed}>
          Next
        </button>
      )}
    </div>
  );
}
```

## API Reference

### FormRenderer Props

| Prop | Type | Description |
|------|------|-------------|
| `spec` | `Forma` | The Forma specification |
| `components` | `ComponentMap` | Map of field types to components |
| `initialData` | `Record<string, unknown>` | Initial form values |
| `onSubmit` | `(data) => void` | Submit handler |
| `onChange` | `(data, computed) => void` | Change handler |
| `layout` | `React.ComponentType<LayoutProps>` | Custom layout |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | Custom field wrapper |
| `validateOn` | `"change" \| "blur" \| "submit"` | Validation timing |

### FormRenderer Ref

```tsx
const formRef = useRef<FormRendererHandle>(null);

// Imperative methods
formRef.current?.submitForm();
formRef.current?.resetForm();
formRef.current?.validateForm();
formRef.current?.focusFirstError();
formRef.current?.getValues();
formRef.current?.setValues({ name: "John" });
```

### useForma Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Record<string, unknown>` | Current form values |
| `computed` | `Record<string, unknown>` | Computed field values |
| `visibility` | `Record<string, boolean>` | Field visibility map |
| `required` | `Record<string, boolean>` | Field required state |
| `enabled` | `Record<string, boolean>` | Field enabled state |
| `errors` | `FieldError[]` | Validation errors |
| `isValid` | `boolean` | Form validity |
| `isSubmitting` | `boolean` | Submission in progress |
| `isDirty` | `boolean` | Any field modified |
| `wizard` | `WizardHelpers \| null` | Wizard navigation |

### useForma Methods

| Method | Description |
|--------|-------------|
| `setFieldValue(path, value)` | Set field value |
| `setFieldTouched(path, touched?)` | Mark field as touched |
| `setValues(values)` | Set multiple values |
| `validateField(path)` | Validate single field |
| `validateForm()` | Validate entire form |
| `submitForm()` | Submit the form |
| `resetForm()` | Reset to initial values |

## License

MIT
