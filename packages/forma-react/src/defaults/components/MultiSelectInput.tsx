import React from "react";
import type { MultiSelectComponentProps } from "../../types.js";

export function MultiSelectInput({ field }: MultiSelectComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const describedBy = [
    field.description ? `${field.name}-description` : null,
    hasErrors ? `${field.name}-errors` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const selected = field.value ?? [];

  const handleToggle = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      field.onChange(selected.filter((v) => v !== optionValue));
    } else {
      field.onChange([...selected, optionValue]);
    }
    field.onBlur();
  };

  return (
    <fieldset
      className="forma-multiselect"
      aria-describedby={describedBy || undefined}
      aria-invalid={hasErrors || undefined}
    >
      <legend className="forma-sr-only">{field.label}</legend>
      {field.options.map((opt) => {
        const optId = `${field.name}-${opt.value}`;
        return (
          <div key={String(opt.value)} className="forma-multiselect__option">
            <input
              id={optId}
              type="checkbox"
              className="forma-checkbox__input"
              checked={selected.includes(String(opt.value))}
              onChange={() => handleToggle(String(opt.value))}
              disabled={field.disabled}
            />
            <label htmlFor={optId} className="forma-checkbox__label">
              {opt.label}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
