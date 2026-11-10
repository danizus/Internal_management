/**
 * Pure string / BigInt money helpers for converting between major display units
 * (e.g. "12.50") and minor bigint strings (e.g. "1250") without floating-point rounding.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  PKR: "Rs ",
};

/**
 * Formats a minor-unit bigint string (e.g. "1250") and currency code ("USD")
 * into a human-readable string like "$12.50 USD".
 */
export function formatMinorToMoney(
  amountMinor: string | bigint,
  currency = "USD"
): string {
  const code = currency.trim().toUpperCase() || "USD";
  const sym = CURRENCY_SYMBOLS[code] ?? "";
  let value: bigint;
  try {
    value = BigInt(amountMinor);
  } catch {
    value = 0n;
  }

  const isNegative = value < 0n;
  const abs = isNegative ? -value : value;
  const major = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";

  return `${sign}${sym}${major.toString()}.${cents} ${code}`;
}

/**
 * Converts a user-entered decimal string (e.g. "12.50", "12.5", "12")
 * into a minor-unit integer string (e.g. "1250", "1250", "1200").
 * Returns null if the input is invalid.
 */
export function parseMajorToMinor(majorInput: string): string | null {
  const trimmed = majorInput.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return null;
  }
  const [wholePart, fracPart = ""] = trimmed.split(".");
  const paddedFrac = fracPart.padEnd(2, "0");
  const combined = BigInt(wholePart) * 100n + BigInt(paddedFrac);
  return combined.toString();
}

/**
 * Converts a minor-unit bigint string (e.g. "1250") into a decimal string
 * suitable for an HTML input (e.g. "12.50").
 */
export function minorToMajorInput(amountMinor: string): string {
  try {
    const val = BigInt(amountMinor);
    const abs = val < 0n ? -val : val;
    const major = abs / 100n;
    const cents = (abs % 100n).toString().padStart(2, "0");
    return `${val < 0n ? "-" : ""}${major.toString()}.${cents}`;
  } catch {
    return "0.00";
  }
}
