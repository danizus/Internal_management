import { describe, it, expect } from "vitest";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  positiveMinorAmountSchema,
  currencyCodeSchema,
  calculateProfitMinor,
} from "../schemas/common.js";

describe("Phase 1: Common Schemas & Money Utilities", () => {
  describe("bigintIdSchema", () => {
    it("accepts positive integer strings and normalizes to decimal string", () => {
      expect(bigintIdSchema.parse("1")).toBe("1");
      expect(bigintIdSchema.parse("9007199254740993")).toBe("9007199254740993");
      expect(bigintIdSchema.parse(42)).toBe("42");
      expect(bigintIdSchema.parse(100n)).toBe("100");
    });

    it("rejects zero, negative, float, or non-numeric IDs", () => {
      expect(() => bigintIdSchema.parse("0")).toThrow();
      expect(() => bigintIdSchema.parse("-5")).toThrow();
      expect(() => bigintIdSchema.parse("12.34")).toThrow();
      expect(() => bigintIdSchema.parse("abc")).toThrow();
    });
  });

  describe("Money minor unit schemas", () => {
    it("validates non-negative minor amounts as stringified bigints", () => {
      expect(nonNegativeMinorAmountSchema.parse("0")).toBe("0");
      expect(nonNegativeMinorAmountSchema.parse("1999")).toBe("1999");
      expect(nonNegativeMinorAmountSchema.parse(2500)).toBe("2500");
    });

    it("rejects negative or decimal strings in minor unit amounts", () => {
      expect(() => nonNegativeMinorAmountSchema.parse("-100")).toThrow();
      expect(() => nonNegativeMinorAmountSchema.parse("19.99")).toThrow();
    });

    it("requires positiveMinorAmountSchema to be strictly greater than 0", () => {
      expect(positiveMinorAmountSchema.parse("1")).toBe("1");
      expect(() => positiveMinorAmountSchema.parse("0")).toThrow();
    });

    it("normalizes and validates 3-letter currency codes", () => {
      expect(currencyCodeSchema.parse("usd")).toBe("USD");
      expect(currencyCodeSchema.parse("EUR")).toBe("EUR");
      expect(currencyCodeSchema.parse(undefined)).toBe("USD");
      expect(() => currencyCodeSchema.parse("US")).toThrow();
      expect(() => currencyCodeSchema.parse("USDT")).toThrow();
    });
  });

  describe("calculateProfitMinor", () => {
    it("computes sales - purchase - processing_charges accurately in bigint", () => {
      // $25.00 sale - $12.00 cost - $1.25 fee = $11.75 (1175 cents)
      expect(calculateProfitMinor("2500", "1200", "125")).toBe("1175");
    });

    it("handles negative profit (loss) accurately", () => {
      expect(calculateProfitMinor("1000", "1200", "50")).toBe("-250");
    });
  });
});
