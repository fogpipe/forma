import React, { useCallback } from "react";
import type { LayoutProps } from "../../types.js";
import { useFormaContext } from "../../context.js";

export function WizardLayout({
  children,
  onSubmit,
  isSubmitting,
}: LayoutProps) {
  const { wizard } = useFormaContext();

  const handleNext = useCallback(() => {
    if (!wizard) return;
    wizard.touchCurrentPageFields();
    if (wizard.validateCurrentPage()) {
      wizard.nextPage();
    }
  }, [wizard]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!wizard) {
        onSubmit();
        return;
      }

      const nativeEvent = e.nativeEvent as SubmitEvent;
      const submitter = nativeEvent.submitter as HTMLButtonElement | null;

      if (wizard.isLastPage && submitter?.dataset.action === "submit") {
        onSubmit();
      } else if (!wizard.isLastPage) {
        handleNext();
      }
    },
    [wizard, onSubmit, handleNext],
  );

  // Fallback to simple form layout if no wizard
  if (!wizard) {
    return (
      <form
        className="forma-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {children}
        <div className="forma-form__actions">
          <button
            type="submit"
            className="forma-button forma-button--primary forma-submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="forma-wizard" onSubmit={handleSubmit} noValidate>
      {/* Step indicator */}
      <div className="forma-wizard__steps" role="navigation" aria-label="Form progress">
        {wizard.pages.map((page, index) => {
          const isCompleted = index < wizard.currentPageIndex;
          const isCurrent = index === wizard.currentPageIndex;
          const stepClass = [
            "forma-step",
            isCompleted && "forma-step--completed",
            isCurrent && "forma-step--current",
            !isCompleted && !isCurrent && "forma-step--upcoming",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={page.id} className={stepClass} aria-current={isCurrent ? "step" : undefined}>
              <span className="forma-step__indicator">
                {isCompleted ? "\u2713" : index + 1}
              </span>
              <span className="forma-step__label">{page.title}</span>
            </div>
          );
        })}
      </div>

      {/* Page content */}
      {children}

      {/* Navigation */}
      <div className="forma-wizard__nav">
        {wizard.hasPreviousPage ? (
          <button
            type="button"
            className="forma-button forma-button--secondary"
            onClick={() => wizard.previousPage()}
          >
            Previous
          </button>
        ) : (
          <div />
        )}

        {wizard.isLastPage ? (
          <button
            type="submit"
            data-action="submit"
            className={`forma-button forma-button--primary forma-submit${isSubmitting ? " forma-submit--loading" : ""}`}
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            className="forma-button forma-button--primary"
            onClick={handleNext}
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}
