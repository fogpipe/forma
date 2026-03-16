import React from "react";
import type { FieldComponentProps } from "../../types.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export function FallbackField({ field }: FieldComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  return (
    <div className="forma-fallback">
      {isDev && (
        <p className="forma-fallback__warning">
          Unknown field type: &quot;{field.field.type}&quot;
        </p>
      )}
      <input
        id={field.name}
        name={field.name}
        type="text"
        className="forma-input"
        value={String(field.value ?? "")}
        onChange={(e) => {
          if ("onChange" in field && typeof field.onChange === "function") {
            (field.onChange as (value: string) => void)(e.target.value);
          }
        }}
        onBlur={field.onBlur}
        disabled={field.disabled}
        aria-invalid={hasErrors || undefined}
      />
    </div>
  );
}
