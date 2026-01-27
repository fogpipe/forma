import { describe, it, expect } from "vitest";
import {
  formatValue,
  isValidFormat,
  parseDecimalFormat,
  SUPPORTED_FORMATS,
  DECIMAL_FORMAT_PATTERN,
} from "../format/index.js";

describe("format module", () => {
  describe("constants", () => {
    it("SUPPORTED_FORMATS includes expected formats", () => {
      expect(SUPPORTED_FORMATS).toContain("currency");
      expect(SUPPORTED_FORMATS).toContain("percent");
      expect(SUPPORTED_FORMATS).toContain("date");
      expect(SUPPORTED_FORMATS).toContain("datetime");
    });

    it("DECIMAL_FORMAT_PATTERN matches valid decimal formats", () => {
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(0)")).toBe(true);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(1)")).toBe(true);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(2)")).toBe(true);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(10)")).toBe(true);
    });

    it("DECIMAL_FORMAT_PATTERN rejects invalid formats", () => {
      expect(DECIMAL_FORMAT_PATTERN.test("decimal")).toBe(false);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal()")).toBe(false);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(-1)")).toBe(false);
      expect(DECIMAL_FORMAT_PATTERN.test("decimal(a)")).toBe(false);
      expect(DECIMAL_FORMAT_PATTERN.test("DECIMAL(2)")).toBe(false);
    });
  });

  describe("isValidFormat", () => {
    it("returns true for supported formats", () => {
      expect(isValidFormat("currency")).toBe(true);
      expect(isValidFormat("percent")).toBe(true);
      expect(isValidFormat("date")).toBe(true);
      expect(isValidFormat("datetime")).toBe(true);
    });

    it("returns true for valid decimal formats", () => {
      expect(isValidFormat("decimal(0)")).toBe(true);
      expect(isValidFormat("decimal(2)")).toBe(true);
      expect(isValidFormat("decimal(5)")).toBe(true);
    });

    it("returns false for invalid formats", () => {
      expect(isValidFormat("invalid")).toBe(false);
      expect(isValidFormat("decimal")).toBe(false);
      expect(isValidFormat("decimal()")).toBe(false);
      expect(isValidFormat("CURRENCY")).toBe(false);
    });
  });

  describe("parseDecimalFormat", () => {
    it("extracts decimal places from valid format", () => {
      expect(parseDecimalFormat("decimal(0)")).toBe(0);
      expect(parseDecimalFormat("decimal(1)")).toBe(1);
      expect(parseDecimalFormat("decimal(2)")).toBe(2);
      expect(parseDecimalFormat("decimal(10)")).toBe(10);
    });

    it("returns null for non-decimal formats", () => {
      expect(parseDecimalFormat("currency")).toBeNull();
      expect(parseDecimalFormat("percent")).toBeNull();
      expect(parseDecimalFormat("invalid")).toBeNull();
    });
  });

  describe("formatValue", () => {
    describe("no format specified", () => {
      it("converts values to strings", () => {
        expect(formatValue(123)).toBe("123");
        expect(formatValue("hello")).toBe("hello");
        expect(formatValue(true)).toBe("true");
        expect(formatValue(false)).toBe("false");
      });

      it("handles null and undefined", () => {
        expect(formatValue(null)).toBe("null");
        expect(formatValue(undefined)).toBe("undefined");
      });
    });

    describe("decimal format", () => {
      it("formats numbers with specified decimal places", () => {
        expect(formatValue(123.456, "decimal(0)")).toBe("123");
        expect(formatValue(123.456, "decimal(1)")).toBe("123.5");
        expect(formatValue(123.456, "decimal(2)")).toBe("123.46");
        expect(formatValue(123.456, "decimal(5)")).toBe("123.45600");
      });

      it("pads with zeros when needed", () => {
        expect(formatValue(123, "decimal(2)")).toBe("123.00");
      });

      it("handles negative numbers", () => {
        expect(formatValue(-123.456, "decimal(2)")).toBe("-123.46");
      });

      it("falls back to string for non-numbers", () => {
        expect(formatValue("not a number", "decimal(2)")).toBe("not a number");
      });
    });

    describe("currency format", () => {
      it("formats numbers as USD currency by default", () => {
        const result = formatValue(1234.56, "currency");
        expect(result).toBe("$1,234.56");
      });

      it("formats zero", () => {
        expect(formatValue(0, "currency")).toBe("$0.00");
      });

      it("formats negative numbers", () => {
        expect(formatValue(-100, "currency")).toBe("-$100.00");
      });

      it("respects currency option", () => {
        const result = formatValue(1234.56, "currency", { currency: "EUR" });
        // EUR formatting varies by locale
        expect(result).toContain("1,234.56");
      });

      it("falls back to string for non-numbers", () => {
        expect(formatValue("not a number", "currency")).toBe("not a number");
      });
    });

    describe("percent format", () => {
      it("formats numbers as percentages", () => {
        expect(formatValue(0.5, "percent")).toBe("50%");
        expect(formatValue(1, "percent")).toBe("100%");
        expect(formatValue(0.156, "percent")).toBe("15.6%");
      });

      it("handles edge cases", () => {
        expect(formatValue(0, "percent")).toBe("0%");
        expect(formatValue(-0.5, "percent")).toBe("-50%");
      });

      it("falls back to string for non-numbers", () => {
        expect(formatValue("not a number", "percent")).toBe("not a number");
      });
    });

    describe("date format", () => {
      it("formats Date objects", () => {
        const date = new Date("2024-03-15T10:30:00Z");
        const result = formatValue(date, "date");
        // Contains month, day, year in some format
        expect(result).toMatch(/3\/15\/2024|15\/3\/2024/);
      });

      it("formats date strings", () => {
        const result = formatValue("2024-03-15", "date");
        expect(result).toMatch(/3\/15\/2024|15\/3\/2024|3\/14\/2024|14\/3\/2024/);
      });

      it("falls back to string for invalid dates", () => {
        expect(formatValue("not a date", "date")).toBe("not a date");
      });
    });

    describe("datetime format", () => {
      it("formats Date objects with time", () => {
        const date = new Date("2024-03-15T10:30:00Z");
        const result = formatValue(date, "datetime");
        // Contains both date and time components
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
        expect(result).toMatch(/\d{1,2}:\d{2}/);
      });

      it("falls back to string for invalid dates", () => {
        expect(formatValue("not a date", "datetime")).toBe("not a date");
      });
    });

    describe("unknown format", () => {
      it("falls back to string conversion", () => {
        expect(formatValue(123, "unknown")).toBe("123");
        expect(formatValue("hello", "invalid")).toBe("hello");
      });
    });

    describe("nullDisplay option", () => {
      it("uses nullDisplay for null values", () => {
        expect(formatValue(null, undefined, { nullDisplay: "—" })).toBe("—");
        expect(formatValue(null, "decimal(2)", { nullDisplay: "N/A" })).toBe("N/A");
      });

      it("uses nullDisplay for undefined values", () => {
        expect(formatValue(undefined, undefined, { nullDisplay: "—" })).toBe("—");
        expect(formatValue(undefined, "currency", { nullDisplay: "-" })).toBe("-");
      });

      it("does not affect non-null values", () => {
        expect(formatValue(123, "decimal(2)", { nullDisplay: "—" })).toBe("123.00");
        expect(formatValue(0, "decimal(2)", { nullDisplay: "—" })).toBe("0.00");
      });
    });

    describe("locale option", () => {
      it("respects locale for currency formatting", () => {
        const result = formatValue(1234.56, "currency", { locale: "de-DE", currency: "EUR" });
        // German locale uses comma for decimals
        expect(result).toContain("1.234,56");
      });

      it("respects locale for percent formatting", () => {
        const result = formatValue(0.5, "percent", { locale: "de-DE" });
        // German locale uses comma for decimals
        expect(result).toContain("50");
        expect(result).toContain("%");
      });
    });

    describe("edge cases", () => {
      it("handles NaN", () => {
        expect(formatValue(NaN, "decimal(2)")).toBe("NaN");
      });

      it("handles Infinity", () => {
        expect(formatValue(Infinity, "decimal(2)")).toBe("Infinity");
        expect(formatValue(-Infinity, "decimal(2)")).toBe("-Infinity");
      });

      it("handles very large numbers", () => {
        const result = formatValue(1e15, "currency");
        expect(result).toContain("$");
      });

      it("handles very small numbers", () => {
        expect(formatValue(0.0001, "decimal(4)")).toBe("0.0001");
      });
    });
  });
});
