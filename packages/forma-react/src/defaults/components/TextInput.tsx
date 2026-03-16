import React from "react";
import type { TextComponentProps } from "../../types.js";

export function TextInput({ field }: TextComponentProps) {
  const inputType = field.fieldType === "phone" ? "tel" : field.fieldType;

  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const input = (
    <input
      id={field.name}
      name={field.name}
      type={inputType}
      className="forma-input"
      value={field.value}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      disabled={field.disabled}
      readOnly={field.readonly}
      placeholder={field.placeholder}
      aria-invalid={hasErrors || undefined}
      aria-required={field.required || undefined}
      aria-describedby={describedBy || undefined}
    />
  );

  if (field.prefix || field.suffix) {
    return (
      <div className="forma-input-adorner">
        {field.prefix && (
          <span className="forma-input-adorner__prefix">{field.prefix}</span>
        )}
        {input}
        {field.suffix && (
          <span className="forma-input-adorner__suffix">{field.suffix}</span>
        )}
      </div>
    );
  }

  return input;
}
