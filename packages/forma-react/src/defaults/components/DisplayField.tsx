import React from "react";
import type { FormatOptions } from "@fogpipe/forma-core";
import { formatValue } from "@fogpipe/forma-core";
import type { DisplayComponentProps } from "../../types.js";

const FORMAT_DEFAULTS: FormatOptions = { nullDisplay: "\u2014" };

export function DisplayField({ field }: DisplayComponentProps) {
  const options = field.formatOptions
    ? { ...FORMAT_DEFAULTS, ...field.formatOptions }
    : FORMAT_DEFAULTS;
  const content =
    field.sourceValue !== undefined
      ? formatValue(field.sourceValue, field.format, options)
      : field.content;

  return (
    <div className="forma-display">
      {content && <p className="forma-display__content">{content}</p>}
    </div>
  );
}
