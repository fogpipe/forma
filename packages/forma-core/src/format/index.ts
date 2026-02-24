/**
 * Format utilities for computed field values
 *
 * Provides constants, validation helpers, and formatting functions
 * for computed field format specifications.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Supported format specifiers (excluding decimal which uses pattern)
 */
export const SUPPORTED_FORMATS = [
  "currency",
  "percent",
  "date",
  "datetime",
] as const;

/**
 * Pattern for decimal format: decimal(N) where N is number of decimal places
 */
export const DECIMAL_FORMAT_PATTERN = /^decimal\((\d+)\)$/;

// ============================================================================
// Types
// ============================================================================

/**
 * Supported format type (excluding decimal pattern)
 */
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * Options for value formatting
 */
export interface FormatOptions {
  /** Locale for number/date formatting (default: "en-US") */
  locale?: string;
  /** Currency code for currency format (default: "USD") */
  currency?: string;
  /** String to display for null/undefined values (default: returns String(value)) */
  nullDisplay?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a format string is valid
 *
 * Valid formats:
 * - "currency"
 * - "percent"
 * - "date"
 * - "datetime"
 * - "decimal(N)" where N is a non-negative integer
 *
 * @param format - Format string to validate
 * @returns True if format is valid
 */
export function isValidFormat(format: string): boolean {
  if (SUPPORTED_FORMATS.includes(format as SupportedFormat)) {
    return true;
  }
  return DECIMAL_FORMAT_PATTERN.test(format);
}

/**
 * Parse decimal format and extract precision
 *
 * @param format - Format string (e.g., "decimal(2)")
 * @returns Number of decimal places, or null if not a decimal format
 */
export function parseDecimalFormat(format: string): number | null {
  const match = format.match(DECIMAL_FORMAT_PATTERN);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format a value according to a format specification
 *
 * Supported formats:
 * - decimal(n) - Number with n decimal places
 * - currency - Number formatted as currency
 * - percent - Number formatted as percentage
 * - date - Date formatted as local date string
 * - datetime - Date formatted as local date/time string
 * - (none/unknown) - Default string conversion
 *
 * @param value - Value to format
 * @param format - Format specification
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * formatValue(1234.567, "decimal(2)")  // "1234.57"
 * formatValue(1234.5, "currency")       // "$1,234.50"
 * formatValue(0.156, "percent")         // "15.6%"
 * formatValue(null, undefined, { nullDisplay: "—" })  // "—"
 */
export function formatValue(
  value: unknown,
  format?: string,
  options?: FormatOptions,
): string {
  const { locale = "en-US", currency = "USD", nullDisplay } = options ?? {};

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (nullDisplay !== undefined) {
      return nullDisplay;
    }
    return String(value);
  }

  // No format specified - default string conversion
  if (!format) {
    return String(value);
  }

  // Handle decimal(n) format
  const decimals = parseDecimalFormat(format);
  if (decimals !== null) {
    return typeof value === "number" ? value.toFixed(decimals) : String(value);
  }

  // Handle currency format
  if (format === "currency") {
    return typeof value === "number"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency,
        }).format(value)
      : String(value);
  }

  // Handle percent format
  if (format === "percent") {
    return typeof value === "number"
      ? new Intl.NumberFormat(locale, {
          style: "percent",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(value)
      : String(value);
  }

  // Handle date format
  if (format === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return !isNaN(date.getTime())
      ? new Intl.DateTimeFormat(locale).format(date)
      : String(value);
  }

  // Handle datetime format
  if (format === "datetime") {
    const date = value instanceof Date ? value : new Date(String(value));
    return !isNaN(date.getTime())
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(date)
      : String(value);
  }

  // Unknown format - fallback to string conversion
  return String(value);
}
