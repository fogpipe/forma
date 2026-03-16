import React from "react";
import type { ComputedComponentProps } from "../../types.js";

export function ComputedDisplay({ field }: ComputedComponentProps) {
  let displayValue: string;
  if (field.value === null || field.value === undefined) {
    displayValue = "\u2014";
  } else if (typeof field.value === "object") {
    try {
      displayValue = JSON.stringify(field.value);
    } catch {
      displayValue = String(field.value);
    }
  } else {
    displayValue = String(field.value);
  }

  return (
    <output
      id={field.name}
      className="forma-computed"
    >
      {displayValue}
    </output>
  );
}
