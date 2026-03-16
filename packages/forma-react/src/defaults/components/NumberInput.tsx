import React from "react";
import type { NumberComponentProps, IntegerComponentProps } from "../../types.js";

function NumberInputBase({
  field,
  parseValue,
}: {
  field: NumberComponentProps["field"] | IntegerComponentProps["field"];
  parseValue: (val: string) => number;
}) {
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
      type="number"
      className={`forma-input forma-input--${field.fieldType}`}
      value={field.value != null ? String(field.value) : ""}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "") {
          field.onChange(null);
        } else {
          const num = parseValue(val);
          field.onChange(isNaN(num) ? null : num);
        }
      }}
      onBlur={field.onBlur}
      disabled={field.disabled}
      readOnly={field.readonly}
      placeholder={field.placeholder}
      min={field.min}
      max={field.max}
      step={field.step ?? (field.fieldType === "integer" ? 1 : "any")}
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

export function NumberInput({ field }: NumberComponentProps) {
  return <NumberInputBase field={field} parseValue={parseFloat} />;
}

export function IntegerInput({ field }: IntegerComponentProps) {
  return (
    <NumberInputBase field={field} parseValue={(v) => parseInt(v, 10)} />
  );
}
