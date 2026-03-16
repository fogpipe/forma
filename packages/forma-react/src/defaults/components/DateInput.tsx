import React from "react";
import type { DateComponentProps, DateTimeComponentProps } from "../../types.js";

export function DateInput({ field }: DateComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      id={field.name}
      name={field.name}
      type="date"
      className="forma-input forma-input--date"
      value={field.value ?? ""}
      onChange={(e) => field.onChange(e.target.value || null)}
      onBlur={field.onBlur}
      disabled={field.disabled}
      readOnly={field.readonly}
      aria-invalid={hasErrors || undefined}
      aria-required={field.required || undefined}
      aria-describedby={describedBy || undefined}
    />
  );
}

export function DateTimeInput({ field }: DateTimeComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // datetime-local expects "YYYY-MM-DDTHH:mm" format
  const inputValue = field.value ?? "";

  return (
    <input
      id={field.name}
      name={field.name}
      type="datetime-local"
      className="forma-input forma-input--datetime"
      value={inputValue}
      onChange={(e) => field.onChange(e.target.value || null)}
      onBlur={field.onBlur}
      disabled={field.disabled}
      readOnly={field.readonly}
      aria-invalid={hasErrors || undefined}
      aria-required={field.required || undefined}
      aria-describedby={describedBy || undefined}
    />
  );
}
