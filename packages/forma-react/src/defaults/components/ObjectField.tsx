import React from "react";
import type { ObjectComponentProps } from "../../types.js";

export function ObjectField({ field }: ObjectComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;

  return (
    <fieldset
      className="forma-object"
      aria-invalid={hasErrors || undefined}
    >
      <legend className="forma-object__legend">{field.label}</legend>
      {field.description && (
        <p className="forma-object__description">{field.description}</p>
      )}
      <div className="forma-object__fields">
        {/* Object child fields are rendered by FormRenderer, not here.
            The object component is a visual container only. */}
      </div>
    </fieldset>
  );
}
