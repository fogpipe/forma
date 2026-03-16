import React from "react";
import type { DisplayComponentProps } from "../../types.js";

export function DisplayField({ field }: DisplayComponentProps) {
  const content =
    field.sourceValue !== undefined
      ? String(field.sourceValue)
      : field.content;

  return (
    <div className="forma-display">
      {content && <p className="forma-display__content">{content}</p>}
    </div>
  );
}
