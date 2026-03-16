import React from "react";
import type { LayoutProps } from "../../types.js";

export function FormLayout({
  children,
  onSubmit,
  isSubmitting,
}: LayoutProps) {
  return (
    <form
      className="forma-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      {children}
      <div className="forma-form__actions">
        {/* Submit is not disabled when invalid — intentional. Disabling prevents
            users from discovering which fields need attention. Instead, clicking
            submit triggers validation and displays errors via FieldWrapper. */}
        <button
          type="submit"
          className={`forma-button forma-button--primary forma-submit${isSubmitting ? " forma-submit--loading" : ""}`}
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
