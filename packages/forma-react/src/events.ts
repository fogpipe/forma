/**
 * Event system for forma-react
 *
 * Lightweight event emitter for form lifecycle events.
 * Events are for side effects (analytics, data injection, external state sync)
 * — they do not trigger React re-renders.
 */

import type { FieldError } from "@fogpipe/forma-core";
import type { PageState } from "./useForma.js";

// ============================================================================
// Event Type Definitions
// ============================================================================

/**
 * Map of all forma event names to their payload types.
 */
export interface FormaEventMap {
  /**
   * Fires after a field value changes via user input, setFieldValue, setValues, or resetForm.
   * Does NOT fire for computed/calculated field changes or on initial mount.
   */
  fieldChanged: {
    /** Field path (e.g., "age" or "medications[0].dosage") */
    path: string;
    /** New value */
    value: unknown;
    /** Value before the change */
    previousValue: unknown;
    /** What triggered the change */
    source: "user" | "reset" | "setValues";
  };

  /**
   * Fires at the start of submitForm(), before validation.
   * The `data` object is mutable — consumers can inject extra fields.
   * Async handlers are awaited before proceeding to validation.
   */
  preSubmit: {
    /** Mutable form data — add/modify fields here */
    data: Record<string, unknown>;
    /** Read-only snapshot of computed values */
    computed: Record<string, unknown>;
  };

  /**
   * Fires after onSubmit resolves/rejects or after validation failure.
   */
  postSubmit: {
    /** The submitted data (reflects any preSubmit mutations) */
    data: Record<string, unknown>;
    /** Whether submission succeeded */
    success: boolean;
    /** Present when onSubmit threw an error */
    error?: Error;
    /** Present when validation failed (onSubmit was never called) */
    validationErrors?: FieldError[];
  };

  /**
   * Fires when the wizard page changes via nextPage, previousPage, or goToPage.
   * Does NOT fire on initial render or automatic page clamping.
   */
  pageChanged: {
    /** Previous page index */
    fromIndex: number;
    /** New page index */
    toIndex: number;
    /** The new current page */
    page: PageState;
  };

  /**
   * Fires after resetForm() completes and state is back to initial values.
   */
  formReset: Record<string, never>;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Listener function type for a specific event.
 */
export type FormaEventListener<K extends keyof FormaEventMap> = (
  event: FormaEventMap[K],
) => void | Promise<void>;

/**
 * Declarative event listener map for useForma `on` option.
 */
export type FormaEvents = Partial<{
  [K in keyof FormaEventMap]: FormaEventListener<K>;
}>;

// ============================================================================
// Event Emitter
// ============================================================================

/**
 * Lightweight event emitter for forma lifecycle events.
 * Uses Map<string, Set<listener>> internally — no external dependencies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyListener = (...args: any[]) => void | Promise<void>;

export class FormaEventEmitter {
  private listeners = new Map<string, Set<AnyListener>>();

  /**
   * Register a listener for an event. Returns an unsubscribe function.
   */
  on<K extends keyof FormaEventMap>(
    event: K,
    listener: FormaEventListener<K>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Fire an event synchronously. Listener errors are caught and logged
   * to prevent one listener from breaking others.
   */
  fire<K extends keyof FormaEventMap>(event: K, payload: FormaEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    for (const listener of set) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[forma] Error in "${event}" event listener:`, error);
      }
    }
  }

  /**
   * Fire an event and await all async listeners sequentially.
   * Used for preSubmit where handlers can be async.
   */
  async fireAsync<K extends keyof FormaEventMap>(
    event: K,
    payload: FormaEventMap[K],
  ): Promise<void> {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    for (const listener of set) {
      try {
        await listener(payload);
      } catch (error) {
        console.error(`[forma] Error in "${event}" event listener:`, error);
      }
    }
  }

  /**
   * Check if any listeners are registered for an event.
   */
  hasListeners(event: keyof FormaEventMap): boolean {
    const set = this.listeners.get(event);
    return set !== undefined && set.size > 0;
  }

  /**
   * Remove all listeners. Called on cleanup.
   */
  clear(): void {
    this.listeners.clear();
  }
}
