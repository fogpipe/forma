import React from "react";
import type { PageWrapperProps } from "../../types.js";

export function PageWrapper({
  title,
  description,
  children,
}: PageWrapperProps) {
  return (
    <div className="forma-page">
      {title && <h2 className="forma-page__title">{title}</h2>}
      {description && (
        <p className="forma-page__description">{description}</p>
      )}
      {children}
    </div>
  );
}
