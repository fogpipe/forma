import React, { useRef } from "react";
import type { ArrayComponentProps } from "../../types.js";

export function ArrayField({ field }: ArrayComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;

  // Stable keys via ref-based sequential counter
  const itemKeysRef = useRef<string[]>([]);
  const nextKeyRef = useRef(0);

  const currentLength = field.helpers.items.length;
  const keysLength = itemKeysRef.current.length;

  if (currentLength > keysLength) {
    for (let i = keysLength; i < currentLength; i++) {
      itemKeysRef.current.push(`item-${nextKeyRef.current++}`);
    }
  } else if (currentLength < keysLength) {
    itemKeysRef.current.length = currentLength;
  }

  const fieldOrder =
    field.itemFieldOrder ?? Object.keys(field.itemFields);

  return (
    <div
      className="forma-array"
      aria-invalid={hasErrors || undefined}
    >
      {field.helpers.items.length === 0 && (
        <p className="forma-array__empty">No items</p>
      )}
      {field.helpers.items.map((_, index) => (
        <div
          key={itemKeysRef.current[index]}
          className="forma-array__item"
        >
          <div className="forma-array__item-fields">
            {fieldOrder.map((fieldName) => {
              const itemProps = field.helpers.getItemFieldProps(
                index,
                fieldName,
              );
              return (
                <div key={fieldName} className="forma-field">
                  <label
                    htmlFor={itemProps.name}
                    className="forma-label"
                  >
                    {itemProps.label}
                  </label>
                  {renderItemField(itemProps)}
                  {itemProps.errors.length > 0 && itemProps.touched && (
                    <div className="forma-field__errors" role="alert">
                      {itemProps.errors.map((err, i) => (
                        <span key={i} className="forma-field__error">
                          {err.message}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="forma-button forma-button--danger forma-array__remove"
            onClick={() => field.helpers.remove(index)}
            disabled={!field.helpers.canRemove || field.disabled}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="forma-button forma-button--secondary forma-array__add"
        onClick={() => field.helpers.push()}
        disabled={!field.helpers.canAdd || field.disabled}
      >
        + Add Item
      </button>
    </div>
  );
}

function renderItemField(
  itemProps: ReturnType<
    ArrayComponentProps["field"]["helpers"]["getItemFieldProps"]
  >,
) {
  const type = itemProps.type;

  if (type === "select" && itemProps.options) {
    return (
      <select
        id={itemProps.name}
        className="forma-select"
        value={String(itemProps.value ?? "")}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            itemProps.onChange(null);
          } else {
            const option = itemProps.options?.find(
              (opt) => String(opt.value) === value,
            );
            itemProps.onChange(option ? option.value : value);
          }
        }}
        onBlur={itemProps.onBlur}
        disabled={!itemProps.enabled}
      >
        <option value="">Select...</option>
        {itemProps.options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "number" || type === "integer") {
    return (
      <input
        id={itemProps.name}
        type="number"
        className="forma-input"
        value={itemProps.value != null ? String(itemProps.value) : ""}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            itemProps.onChange(null);
          } else {
            const num =
              type === "integer"
                ? parseInt(val, 10)
                : parseFloat(val);
            itemProps.onChange(isNaN(num) ? null : num);
          }
        }}
        onBlur={itemProps.onBlur}
        disabled={!itemProps.enabled}
        step={type === "integer" ? 1 : "any"}
      />
    );
  }

  if (type === "boolean") {
    return (
      <div className="forma-checkbox">
        <input
          id={itemProps.name}
          type="checkbox"
          className="forma-checkbox__input"
          checked={Boolean(itemProps.value)}
          onChange={(e) => itemProps.onChange(e.target.checked)}
          onBlur={itemProps.onBlur}
          disabled={!itemProps.enabled}
        />
        <label htmlFor={itemProps.name} className="forma-checkbox__label">
          {itemProps.label}
        </label>
      </div>
    );
  }

  // Default: text input
  return (
    <input
      id={itemProps.name}
      type="text"
      className="forma-input"
      value={String(itemProps.value ?? "")}
      onChange={(e) => itemProps.onChange(e.target.value)}
      onBlur={itemProps.onBlur}
      disabled={!itemProps.enabled}
      placeholder={itemProps.placeholder}
    />
  );
}
