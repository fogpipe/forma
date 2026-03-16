import React from "react";
import type { BooleanComponentProps } from "../../types.js";

export function BooleanInput({ field }: BooleanComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="forma-checkbox">
      <input
        id={field.name}
        name={field.name}
        type="checkbox"
        className="forma-checkbox__input"
        checked={field.value ?? false}
        onChange={(e) => field.onChange(e.target.checked)}
        onBlur={field.onBlur}
        disabled={field.disabled}
        aria-invalid={hasErrors || undefined}
        aria-describedby={describedBy || undefined}
      />
      <label htmlFor={field.name} className="forma-checkbox__label">
        {field.label}
      </label>
    </div>
  );
}
