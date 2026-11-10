import { z } from "zod";

/**
 * Validates a positive bigint ID (accepts string or number/bigint input, outputs canonical decimal string).
 * Per AGENTS.md: IDs are bigint, sent as strings in JSON.
 */
export const bigintIdSchema = z
  .union([z.string(), z.number().int(), z.bigint()])
  .transform((val, ctx) => {
    const raw = typeof val === "string" ? val.trim() : String(val);
    if (!/^[1-9]\d*$/.test(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a positive bigint ID string",
      });
      return z.NEVER;
    }
    try {
      const parsed = BigInt(raw);
      if (parsed <= 0n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ID must be greater than 0",
        });
        return z.NEVER;
      }
      return parsed.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid bigint ID",
      });
      return z.NEVER;
    }
  });

/**
 * Validates a non-negative bigint amount in minor units (e.g., cents).
 * Sent and stored as a decimal string in JSON to preserve bigint precision.
 */
export const nonNegativeMinorAmountSchema = z
  .union([z.string(), z.number().int(), z.bigint()])
  .transform((val, ctx) => {
    const raw = typeof val === "string" ? val.trim() : String(val);
    if (!/^\d+$/.test(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a non-negative integer in minor units",
      });
      return z.NEVER;
    }
    try {
      const parsed = BigInt(raw);
      return parsed.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid minor unit bigint amount",
      });
      return z.NEVER;
    }
  });

/**
 * Validates a strictly positive bigint amount in minor units (> 0).
 */
export const positiveMinorAmountSchema = nonNegativeMinorAmountSchema.refine(
  (val) => BigInt(val) > 0n,
  { message: "Amount must be greater than 0 minor units" }
);

/**
 * Validates a 3-letter uppercase ISO 4217 currency code (defaults to USD).
 */
export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. USD)")
  .default("USD");

/**
 * Computes net profit in minor units: sales - purchase - processing_charges.
 * Can be negative if costs exceed sales. Returns stringified bigint.
 */
export function calculateProfitMinor(
  salesMinor: string | bigint,
  purchaseMinor: string | bigint,
  processingChargesMinor: string | bigint = 0n
): string {
  const sales = BigInt(salesMinor);
  const purchase = BigInt(purchaseMinor);
  const charges = BigInt(processingChargesMinor);
  return (sales - purchase - charges).toString();
}
