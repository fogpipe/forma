/**
 * React Context for Forma
 */

import { createContext, useContext } from "react";
import type { UseFormaReturn } from "./useForma.js";

/**
 * Context for sharing form state across components
 */
export const FormaContext = createContext<UseFormaReturn | null>(null);

/**
 * Hook to access Forma context
 * @throws Error if used outside of FormaContext.Provider
 */
export function useFormaContext(): UseFormaReturn {
  const context = useContext(FormaContext);
  if (!context) {
    throw new Error(
      "useFormaContext must be used within a FormaContext.Provider",
    );
  }
  return context;
}
