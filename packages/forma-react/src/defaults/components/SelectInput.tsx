import React from "react";
import type { SelectComponentProps } from "../../types.js";

export function SelectInput({ field }: SelectComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select
      id={field.name}
      name={field.name}
      className="forma-select"
      value={field.value !== null ? String(field.value) : ""}
      onChange={(e) => {
        const value = e.target.value;
        if (!value) {
          field.onChange(null);
        } else {
          // Preserve string value
          field.onChange(value);
        }
      }}
      onBlur={field.onBlur}
      disabled={field.disabled}
      aria-invalid={hasErrors || undefined}
      aria-required={field.required || undefined}
      aria-describedby={describedBy || undefined}
    >
      {(!field.required || field.value === null) && (
        <option value="">{field.placeholder ?? "Select..."}</option>
      )}
      {field.options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
