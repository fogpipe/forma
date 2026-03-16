import React from "react";
import type { FieldWrapperProps } from "../../types.js";
import { useFormaContext } from "../../context.js";

export function FieldWrapper({
  fieldPath,
  field,
  children,
  errors,
  touched,
  showRequiredIndicator,
  visible,
}: FieldWrapperProps) {
  const { isSubmitted } = useFormaContext();

  if (!visible) return null;

  const shouldShowMessages = touched || isSubmitted;
  const visibleErrors = shouldShowMessages
    ? errors.filter((e) => e.severity === "error")
    : [];
  const visibleWarnings = shouldShowMessages
    ? errors.filter((e) => e.severity === "warning")
    : [];
  const hasErrors = visibleErrors.length > 0;
  const hasWarnings = visibleWarnings.length > 0;

  const classNames = [
    "forma-field",
    hasErrors && "forma-field--error",
    !hasErrors && hasWarnings && "forma-field--warning",
    showRequiredIndicator && "forma-field--required",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} data-field-path={fieldPath}>
      {field.label && field.type !== "boolean" && (
        <label htmlFor={fieldPath} className="forma-label">
          {field.label}
          {showRequiredIndicator && (
            <span className="forma-label__required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}
      {field.description && (
        <div
          id={`${fieldPath}-description`}
          className="forma-field__description"
        >
          {field.description}
        </div>
      )}
      {children}
      {hasErrors && (
        <div
          id={`${fieldPath}-errors`}
          className="forma-field__errors"
          role="alert"
        >
          {visibleErrors.map((error, i) => (
            <span key={i} className="forma-field__error">
              {error.message}
            </span>
          ))}
        </div>
      )}
      {hasWarnings && (
        <div className="forma-field__warnings">
          {visibleWarnings.map((warning, i) => (
            <span key={i} className="forma-field__warning">
              {warning.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
