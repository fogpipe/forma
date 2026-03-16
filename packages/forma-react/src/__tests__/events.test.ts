/**
 * Event system tests for @fogpipe/forma-react
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import { FormaEventEmitter } from "../events.js";
import type { FormaEventMap } from "../events.js";
import { createTestSpec } from "./test-utils.js";

// ============================================================================
// FormaEventEmitter unit tests
// ============================================================================

describe("FormaEventEmitter", () => {
  let emitter: FormaEventEmitter;

  beforeEach(() => {
    emitter = new FormaEventEmitter();
  });

  it("should register listener and fire event with correct payload", () => {
    const listener = vi.fn();
    emitter.on("fieldChanged", listener);

    const payload: FormaEventMap["fieldChanged"] = {
      path: "name",
      value: "John",
      previousValue: "",
      source: "user",
    };
    emitter.fire("fieldChanged", payload);

    expect(listener).toHaveBeenCalledWith(payload);
  });

  it("should fire multiple listeners in registration order", () => {
    const calls: number[] = [];
    emitter.on("fieldChanged", () => {
      calls.push(1);
    });
    emitter.on("fieldChanged", () => {
      calls.push(2);
    });
    emitter.on("fieldChanged", () => {
      calls.push(3);
    });

    emitter.fire("fieldChanged", {
      path: "x",
      value: 1,
      previousValue: 0,
      source: "user",
    });

    expect(calls).toEqual([1, 2, 3]);
  });

  it("should unsubscribe only the target listener", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsub = emitter.on("fieldChanged", listenerA);
    emitter.on("fieldChanged", listenerB);

    unsub();

    emitter.fire("fieldChanged", {
      path: "x",
      value: 1,
      previousValue: 0,
      source: "user",
    });

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalled();
  });

  it("should report hasListeners correctly", () => {
    expect(emitter.hasListeners("fieldChanged")).toBe(false);

    const unsub = emitter.on("fieldChanged", () => {});
    expect(emitter.hasListeners("fieldChanged")).toBe(true);

    unsub();
    expect(emitter.hasListeners("fieldChanged")).toBe(false);
  });

  it("should not throw when firing with no listeners", () => {
    expect(() => {
      emitter.fire("fieldChanged", {
        path: "x",
        value: 1,
        previousValue: 0,
        source: "user",
      });
    }).not.toThrow();
  });

  it("should catch listener errors without breaking other listeners", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const goodListener = vi.fn();

    emitter.on("fieldChanged", () => {
      throw new Error("boom");
    });
    emitter.on("fieldChanged", goodListener);

    emitter.fire("fieldChanged", {
      path: "x",
      value: 1,
      previousValue: 0,
      source: "user",
    });

    expect(goodListener).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should await async listeners sequentially in fireAsync", async () => {
    const order: number[] = [];

    emitter.on("preSubmit", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });
    emitter.on("preSubmit", async () => {
      order.push(2);
    });

    await emitter.fireAsync("preSubmit", {
      data: {},
      computed: {},
    });

    expect(order).toEqual([1, 2]);
  });

  it("should clear all listeners", () => {
    emitter.on("fieldChanged", () => {});
    emitter.on("preSubmit", () => {});
    emitter.clear();

    expect(emitter.hasListeners("fieldChanged")).toBe(false);
    expect(emitter.hasListeners("preSubmit")).toBe(false);
  });
});

// ============================================================================
// fieldChanged event tests
// ============================================================================

describe("fieldChanged event", () => {
  it("should fire with correct payload on setFieldValue", async () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "old" },
        on: { fieldChanged: listener },
      }),
    );

    act(() => {
      result.current.setFieldValue("name", "new");
    });

    // fieldChanged fires in useEffect (after render)
    expect(listener).toHaveBeenCalledWith({
      path: "name",
      value: "new",
      previousValue: "old",
      source: "user",
    });
  });

  it("should have source 'setValues' for setValues", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: {
        name: { type: "text" },
        age: { type: "number" },
      },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "old", age: 20 },
        on: { fieldChanged: listener },
      }),
    );

    act(() => {
      result.current.setValues({ name: "new", age: 30 });
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ path: "name", source: "setValues" }),
    );
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ path: "age", source: "setValues" }),
    );
  });

  it("should have source 'reset' for resetForm", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "initial" },
        on: { fieldChanged: listener },
      }),
    );

    // Change value first
    act(() => {
      result.current.setFieldValue("name", "changed");
    });
    listener.mockClear();

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "name",
        value: "initial",
        previousValue: "changed",
        source: "reset",
      }),
    );
  });

  it("should NOT fire on initial mount", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    renderHook(() =>
      useForma({
        spec,
        initialData: { name: "hello" },
        on: { fieldChanged: listener },
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });

  it("should NOT fire when value is set to same value", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "same" },
        on: { fieldChanged: listener },
      }),
    );

    act(() => {
      result.current.setFieldValue("name", "same");
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("should work with imperative forma.on()", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({ spec, initialData: { name: "old" } }),
    );

    // Register imperatively
    let unsub: () => void;
    act(() => {
      unsub = result.current.on("fieldChanged", listener);
    });

    act(() => {
      result.current.setFieldValue("name", "new");
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ path: "name", value: "new" }),
    );

    // Unsubscribe
    listener.mockClear();
    act(() => {
      unsub();
    });

    act(() => {
      result.current.setFieldValue("name", "newer");
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("should not cause infinite loop when setFieldValue called inside handler", () => {
    const spec = createTestSpec({
      fields: {
        name: { type: "text" },
        mirror: { type: "text" },
      },
    });

    const calls: string[] = [];

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "", mirror: "" },
        on: {
          fieldChanged: (event) => {
            calls.push(event.path);
            // This would cause infinite loop without recursion guard
            if (event.path === "name") {
              result.current.setFieldValue("mirror", event.value);
            }
          },
        },
      }),
    );

    act(() => {
      result.current.setFieldValue("name", "hello");
    });

    // Only "name" fires (mirror is blocked by recursion guard)
    expect(calls).toEqual(["name"]);
  });
});

// ============================================================================
// preSubmit event tests
// ============================================================================

describe("preSubmit event", () => {
  it("should fire before validation with current data", async () => {
    const listener = vi.fn();
    const onSubmit = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "John" },
        onSubmit,
        on: { preSubmit: listener },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(listener).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "John" }),
      computed: expect.any(Object),
    });
    expect(listener).toHaveBeenCalledBefore(onSubmit);
  });

  it("should allow mutating data before validation/submit", async () => {
    const onSubmit = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "John" },
        onSubmit,
        on: {
          preSubmit: (event) => {
            event.data.token = "injected-token";
          },
        },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ token: "injected-token" }),
    );
  });

  it("should await async handler", async () => {
    const onSubmit = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "John" },
        onSubmit,
        on: {
          preSubmit: async (event) => {
            event.data.asyncToken = await Promise.resolve("async-value");
          },
        },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ asyncToken: "async-value" }),
    );
  });

  it("should work without preSubmit listener (backward compat)", async () => {
    const onSubmit = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({ spec, initialData: { name: "John" }, onSubmit }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "John" }),
    );
  });
});

// ============================================================================
// postSubmit event tests
// ============================================================================

describe("postSubmit event", () => {
  it("should fire with success:true after successful submit", async () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "John" },
        onSubmit: async () => {},
        on: { postSubmit: listener },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("should fire with success:false and error when onSubmit throws", async () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "John" },
        onSubmit: async () => {
          throw new Error("submit failed");
        },
        on: { postSubmit: listener },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(Error),
      }),
    );
  });

  it("should fire with validationErrors when validation fails", async () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text", required: true } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        onSubmit: async () => {},
        on: { postSubmit: listener },
      }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        validationErrors: expect.any(Array),
      }),
    );
  });
});

// ============================================================================
// formReset event tests
// ============================================================================

describe("formReset event", () => {
  it("should fire after resetForm()", () => {
    const listener = vi.fn();
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "initial" },
        on: { formReset: listener },
      }),
    );

    // Change something first to make form dirty
    act(() => {
      result.current.setFieldValue("name", "changed");
    });

    act(() => {
      result.current.resetForm();
    });

    expect(listener).toHaveBeenCalled();
  });

  it("should fire fieldChanged before formReset (ordering)", () => {
    const events: string[] = [];
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({
        spec,
        initialData: { name: "initial" },
        on: {
          fieldChanged: () => {
            events.push("fieldChanged");
          },
          formReset: () => {
            events.push("formReset");
          },
        },
      }),
    );

    act(() => {
      result.current.setFieldValue("name", "changed");
    });
    events.length = 0; // clear initial fieldChanged

    act(() => {
      result.current.resetForm();
    });

    expect(events).toEqual(["fieldChanged", "formReset"]);
  });
});

// ============================================================================
// pageChanged event tests
// ============================================================================

describe("pageChanged event", () => {
  const wizardSpec = createTestSpec({
    fields: {
      name: { type: "text" },
      age: { type: "number" },
      email: { type: "text" },
    },
    pages: [
      { id: "page1", title: "Page 1", fields: ["name"] },
      { id: "page2", title: "Page 2", fields: ["age"] },
      { id: "page3", title: "Page 3", fields: ["email"] },
    ],
  });

  it("should fire on nextPage()", () => {
    const listener = vi.fn();

    const { result } = renderHook(() =>
      useForma({ spec: wizardSpec, on: { pageChanged: listener } }),
    );

    act(() => {
      result.current.wizard!.nextPage();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        fromIndex: 0,
        toIndex: 1,
      }),
    );
  });

  it("should fire on previousPage()", () => {
    const listener = vi.fn();

    const { result } = renderHook(() =>
      useForma({ spec: wizardSpec, on: { pageChanged: listener } }),
    );

    // Go to page 2 first
    act(() => {
      result.current.wizard!.nextPage();
    });
    listener.mockClear();

    act(() => {
      result.current.wizard!.previousPage();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        fromIndex: 1,
        toIndex: 0,
      }),
    );
  });

  it("should fire on goToPage()", () => {
    const listener = vi.fn();

    const { result } = renderHook(() =>
      useForma({ spec: wizardSpec, on: { pageChanged: listener } }),
    );

    act(() => {
      result.current.wizard!.goToPage(2);
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        fromIndex: 0,
        toIndex: 2,
      }),
    );
  });

  it("should NOT fire on initial render", () => {
    const listener = vi.fn();

    renderHook(() =>
      useForma({ spec: wizardSpec, on: { pageChanged: listener } }),
    );

    expect(listener).not.toHaveBeenCalled();
  });

  it("should include page state in payload", () => {
    const listener = vi.fn();

    const { result } = renderHook(() =>
      useForma({ spec: wizardSpec, on: { pageChanged: listener } }),
    );

    act(() => {
      result.current.wizard!.nextPage();
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({
          id: "page2",
          title: "Page 2",
        }),
      }),
    );
  });
});

// ============================================================================
// Backward compatibility
// ============================================================================

describe("backward compatibility", () => {
  it("should work identically without on option", () => {
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() =>
      useForma({ spec, initialData: { name: "test" } }),
    );

    // Basic operations should work
    act(() => {
      result.current.setFieldValue("name", "changed");
    });
    expect(result.current.data.name).toBe("changed");

    act(() => {
      result.current.resetForm();
    });
    expect(result.current.data.name).toBe("test");
  });

  it("should expose on() method on return object", () => {
    const spec = createTestSpec({
      fields: { name: { type: "text" } },
    });

    const { result } = renderHook(() => useForma({ spec }));

    expect(typeof result.current.on).toBe("function");
  });
});
