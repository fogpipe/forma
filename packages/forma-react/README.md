# @fogpipe/forma-react

Headless React form renderer for Forma specifications.

## Installation

```bash
npm install @fogpipe/forma-core @fogpipe/forma-react
```

## Features

- **Headless Architecture** - Bring your own UI components
- **useForma Hook** - Complete form state management
- **FormRenderer Component** - Declarative form rendering
- **Multi-Page Support** - Built-in wizard navigation
- **Type Safety** - Full TypeScript support
- **Accessibility** - Built-in ARIA attribute support
- **Error Boundary** - Graceful error handling for form components

## Quick Start

### 1. Define Your Components

Components receive `{ field, spec }` props. The `field` object contains all field state and handlers:

```tsx
import type {
  ComponentMap,
  TextComponentProps,
  BooleanComponentProps,
} from "@fogpipe/forma-react";

const TextInput = ({ field }: TextComponentProps) => (
  <div>
    <input
      type="text"
      value={field.value || ""}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      placeholder={field.placeholder}
      aria-invalid={field["aria-invalid"]}
      aria-describedby={field["aria-describedby"]}
      aria-required={field["aria-required"]}
    />
    {field.errors.map((e, i) => (
      <span key={i} className="error">
        {e.message}
      </span>
    ))}
  </div>
);

const Checkbox = ({ field }: BooleanComponentProps) => (
  <label>
    <input
      type="checkbox"
      checked={field.value || false}
      onChange={(e) => field.onChange(e.target.checked)}
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
import { FormRenderer } from "@fogpipe/forma-react";
import type { Forma } from "@fogpipe/forma-core";

const myForm: Forma = {
  meta: { title: "Contact Us" },
  fields: [
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "subscribe", type: "boolean", label: "Subscribe to newsletter" },
  ],
};

function App() {
  const handleSubmit = (data: Record<string, unknown>) => {
    console.log("Submitted:", data);
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
import { useForma } from "@fogpipe/forma-react";

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
    onSubmit: (data) => console.log(data),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitForm();
      }}
    >
      {spec.fields.map((field) => {
        if (!visibility[field.id]) return null;

        return (
          <div key={field.id}>
            <label>{field.label}</label>
            <input
              value={String(data[field.id] || "")}
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
      <div>
        Page {wizard.currentPageIndex + 1} of {wizard.pages.length}
      </div>

      {/* Current page fields */}
      {wizard.currentPage?.fields.map((fieldId) => {
        const field = spec.fields.find((f) => f.id === fieldId);
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

## Event System

The event system lets you observe form lifecycle events for side effects like analytics, data injection, and external state sync. Events do not trigger React re-renders.

### Available Events

| Event          | Description                                         |
| -------------- | --------------------------------------------------- |
| `fieldChanged` | Fires after a field value changes                   |
| `preSubmit`    | Fires before validation; `data` is mutable          |
| `postSubmit`   | Fires after submission (success, error, or invalid) |
| `pageChanged`  | Fires when wizard page changes                      |
| `formReset`    | Fires after `resetForm()` completes                 |

### Declarative Registration

Pass listeners via the `on` option — callbacks are stable (ref-based):

```tsx
const forma = useForma({
  spec,
  onSubmit: handleSubmit,
  on: {
    fieldChanged: (event) => {
      analytics.track("field_changed", {
        path: event.path,
        source: event.source,
      });
    },
    preSubmit: async (event) => {
      event.data.token = await getCSRFToken();
    },
    postSubmit: (event) => {
      if (event.success) router.push("/thank-you");
    },
  },
});
```

### Imperative Registration

Register listeners dynamically — returns an unsubscribe function:

```tsx
const forma = useForma({ spec, onSubmit: handleSubmit });

useEffect(() => {
  const unsubscribe = forma.on("fieldChanged", (event) => {
    console.log(`${event.path}: ${event.previousValue} → ${event.value}`);
  });
  return unsubscribe;
}, [forma]);
```

### Event Payloads

**`fieldChanged`**: `{ path, value, previousValue, source }` where `source` is `'user' | 'reset' | 'setValues'`

**`preSubmit`**: `{ data, computed }` — mutate `data` to inject fields before validation

**`postSubmit`**: `{ data, success, error?, validationErrors? }`

**`pageChanged`**: `{ fromIndex, toIndex, page }`

**`formReset`**: `{}` (no payload)

## API Reference

### FormRenderer Props

| Prop           | Type                                     | Description                      |
| -------------- | ---------------------------------------- | -------------------------------- |
| `spec`         | `Forma`                                  | The Forma specification          |
| `components`   | `ComponentMap`                           | Map of field types to components |
| `initialData`  | `Record<string, unknown>`                | Initial form values              |
| `onSubmit`     | `(data) => void`                         | Submit handler                   |
| `onChange`     | `(data, computed) => void`               | Change handler                   |
| `layout`       | `React.ComponentType<LayoutProps>`       | Custom layout                    |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | Custom field wrapper             |
| `validateOn`   | `"change" \| "blur" \| "submit"`         | Validation timing                |

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

| Property       | Type                      | Description            |
| -------------- | ------------------------- | ---------------------- |
| `data`         | `Record<string, unknown>` | Current form values    |
| `computed`     | `Record<string, unknown>` | Computed field values  |
| `visibility`   | `Record<string, boolean>` | Field visibility map   |
| `required`     | `Record<string, boolean>` | Field required state   |
| `enabled`      | `Record<string, boolean>` | Field enabled state    |
| `errors`       | `FieldError[]`            | Validation errors      |
| `isValid`      | `boolean`                 | Form validity          |
| `isSubmitting` | `boolean`                 | Submission in progress |
| `isDirty`      | `boolean`                 | Any field modified     |
| `wizard`       | `WizardHelpers \| null`   | Wizard navigation      |

### useForma Methods

| Method                            | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `setFieldValue(path, value)`      | Set field value                              |
| `setFieldTouched(path, touched?)` | Mark field as touched                        |
| `setValues(values)`               | Set multiple values                          |
| `validateField(path)`             | Validate single field                        |
| `validateForm()`                  | Validate entire form                         |
| `submitForm()`                    | Submit the form                              |
| `resetForm()`                     | Reset to initial values                      |
| `on(event, listener)`             | Register event listener; returns unsubscribe |

### useForma Options

| Option                 | Type                             | Default  | Description                 |
| ---------------------- | -------------------------------- | -------- | --------------------------- |
| `spec`                 | `Forma`                          | required | The Forma specification     |
| `initialData`          | `Record<string, unknown>`        | `{}`     | Initial form values         |
| `onSubmit`             | `(data) => void`                 | -        | Submit handler              |
| `onChange`             | `(data, computed) => void`       | -        | Change handler              |
| `validateOn`           | `"change" \| "blur" \| "submit"` | `"blur"` | When to validate            |
| `referenceData`        | `Record<string, unknown>`        | -        | Additional reference data   |
| `validationDebounceMs` | `number`                         | `0`      | Debounce validation (ms)    |
| `on`                   | `FormaEvents`                    | -        | Declarative event listeners |

## Error Boundary

Wrap forms with `FormaErrorBoundary` to catch render errors gracefully:

```tsx
import { FormRenderer, FormaErrorBoundary } from "@fogpipe/forma-react";

function App() {
  return (
    <FormaErrorBoundary
      fallback={<div>Something went wrong with the form</div>}
      onError={(error) => console.error("Form error:", error)}
    >
      <FormRenderer spec={myForm} components={components} />
    </FormaErrorBoundary>
  );
}
```

The error boundary supports:

- Custom fallback UI (static or function)
- `onError` callback for logging
- `resetKey` prop to reset error state

## Default Components

Don't want to build every field component yourself? The default component library gives you a working form in 2 lines:

```tsx
import { DefaultFormRenderer } from "@fogpipe/forma-react/defaults";
import "@fogpipe/forma-react/defaults/styles.css";

<DefaultFormRenderer spec={formaSpec} onSubmit={handleSubmit} />;
```

This renders a fully styled, accessible form with all 18 field types, error handling, and wizard support — zero configuration.

### Override Individual Components

Swap any component while keeping the rest:

```tsx
import { FormRenderer } from "@fogpipe/forma-react";
import {
  defaultComponentMap,
  defaultFieldWrapper,
  defaultLayout,
} from "@fogpipe/forma-react/defaults";
import "@fogpipe/forma-react/defaults/styles.css";

const components = { ...defaultComponentMap, select: MyFancySelect };

<FormRenderer
  spec={formaSpec}
  components={components}
  fieldWrapper={defaultFieldWrapper}
  layout={defaultLayout}
  onSubmit={handleSubmit}
/>;
```

### Wizard Forms

Enable wizard layout for multi-page forms:

```tsx
<DefaultFormRenderer spec={wizardSpec} onSubmit={handleSubmit} wizardLayout />
```

### Theming

Override CSS variables to customize the look:

```css
:root {
  --forma-color-primary: #7c3aed;
  --forma-color-error: #e11d48;
  --forma-radius: 12px;
  --forma-font-family: "Inter", sans-serif;
}
```

Dark mode works via `[data-theme="dark"]` attribute or `prefers-color-scheme: dark` media query.

### Component Reference

| Field Type | Component | Renders |
|---|---|---|
| `text`, `email`, `phone`, `url`, `password` | TextInput | `<input>` with type mapping |
| `textarea` | TextareaInput | `<textarea>` |
| `number` | NumberInput | `<input type="number">` with parseFloat |
| `integer` | IntegerInput | `<input type="number">` with parseInt |
| `boolean` | BooleanInput | Custom styled checkbox |
| `date` | DateInput | `<input type="date">` |
| `datetime` | DateTimeInput | `<input type="datetime-local">` |
| `select` | SelectInput | Native `<select>` with custom arrow |
| `multiselect` | MultiSelectInput | Checkbox group |
| `array` | ArrayField | Item list with Add/Remove |
| `object` | ObjectField | `<fieldset>` container |
| `computed` | ComputedDisplay | Read-only `<output>` |
| `display` | DisplayField | Static content `<div>` |
| `matrix` | MatrixField | `<table>` with radio/checkbox cells |
| `fallback` | FallbackField | Text input + dev warning |

See the [full documentation](https://docs.formidable.fogpipe.com/forma-react/default-components) for theming details, all CSS variables, and advanced usage.

## License

MIT
