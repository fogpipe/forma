/**
 * FormaErrorBoundary Component
 *
 * Error boundary for catching render errors in form components.
 * Provides graceful error handling and recovery options.
 */

import React from "react";

/**
 * Props for FormaErrorBoundary component
 */
export interface FormaErrorBoundaryProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Custom fallback UI to show when an error occurs */
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Key to reset the error boundary (change this to reset) */
  resetKey?: string | number;
}

/**
 * State for FormaErrorBoundary component
 */
interface FormaErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default fallback component shown when an error occurs
 */
function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <div className="forma-error-boundary" role="alert">
      <h3>Something went wrong</h3>
      <p>An error occurred while rendering the form.</p>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button type="button" onClick={onReset}>
        Try again
      </button>
    </div>
  );
}

/**
 * Error boundary component for Forma forms
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * @example
 * ```tsx
 * <FormaErrorBoundary
 *   fallback={<div>Form error occurred</div>}
 *   onError={(error) => logError(error)}
 * >
 *   <FormRenderer spec={spec} components={components} />
 * </FormaErrorBoundary>
 * ```
 */
export class FormaErrorBoundary extends React.Component<
  FormaErrorBoundaryProps,
  FormaErrorBoundaryState
> {
  constructor(props: FormaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FormaErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: FormaErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback error={this.state.error} onReset={this.reset} />
      );
    }

    return this.props.children;
  }
}
