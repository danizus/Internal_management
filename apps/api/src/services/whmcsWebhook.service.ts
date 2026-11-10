import crypto from "node:crypto";
import { env } from "../config/env.js";
import { getDisplayPackageByWhmcsPidDb } from "../db/displayPackages.db.js";
import {
  createSyncLogDb,
  upsertClientFromWhmcsDb,
  upsertPurchaseFromWhmcsDb,
  updatePurchaseStatusByWhmcsServiceIdDb,
} from "../db/whmcsSync.db.js";
import { calculateProfitMinor } from "../schemas/common.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface WhmcsWebhookPayload {
  event: "order_paid" | "order_accepted" | "invoice_paid" | "service_status_change";
  order_id?: string | number | null;
  service_id: string | number;
  invoice_id?: string | number | null;
  product_id?: string | number | null; // whmcs_pid
  client: {
    client_id: string | number;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
  };
  amount?: string | number; // e.g. "15.00" or 15
  currency?: string;
  billing_cycle?: string;
  payment_method?: string | null;
  due_date?: string | null;
  status?: string;
}

/**
 * Validates HMAC-SHA256 signature from X-WHMCS-Signature header against the raw JSON string.
 */
export function verifyWhmcsWebhookSignature(
  signature: string | undefined,
  rawPayload: string
): boolean {
  if (!signature || !env.WHMCS_WEBHOOK_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", env.WHMCS_WEBHOOK_SECRET)
    .update(rawPayload)
    .digest("hex");

  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

/**
 * Normalizes major currency string/number (e.g. "15.50" or 15) to minor unit bigint string ("1550").
 */
export function majorToMinorString(amount: string | number | undefined): string {
  if (amount === undefined || amount === null) return "0";
  const str = String(amount).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return "0";

  const [whole, frac = ""] = str.split(".");
  const padded = frac.padEnd(2, "0");
  return (BigInt(whole) * 100n + BigInt(padded)).toString();
}

export async function processWhmcsWebhookService(
  payload: WhmcsWebhookPayload,
  rawBody: string,
  signatureHeader?: string
): Promise<{ client_id: string; purchase_id?: string }> {
  const isSignatureValid = verifyWhmcsWebhookSignature(
    signatureHeader,
    rawBody
  );

  if (!isSignatureValid) {
    await createSyncLogDb(
      "webhook",
      payload.event || "unknown",
      String(payload.service_id || "unknown"),
      payload as unknown as Record<string, unknown>,
      "failed",
      "Invalid or missing HMAC-SHA256 signature in X-WHMCS-Signature header"
    );
    throw new HttpError(401, "Invalid webhook HMAC signature");
  }

  try {
    // 1. Ingest/Upsert Client
    const clientId = await upsertClientFromWhmcsDb({
      whmcs_client_id: String(payload.client.client_id),
      client_name: payload.client.name.trim(),
      client_email: payload.client.email.trim().toLowerCase(),
      client_phone: payload.client.phone?.trim() || null,
      company_name: payload.client.company?.trim() || null,
      status: "active",
    });

    // 2. Handle Status Changes (e.g. Suspended / Cancelled)
    if (payload.event === "service_status_change" && payload.status) {
      const normalizedStatus =
        payload.status.toLowerCase() === "suspended"
          ? "suspended"
          : payload.status.toLowerCase() === "cancelled" ||
            payload.status.toLowerCase() === "terminated"
          ? "cancelled"
          : "active";

      await updatePurchaseStatusByWhmcsServiceIdDb(
        String(payload.service_id),
        normalizedStatus
      );

      await createSyncLogDb(
        "webhook",
        payload.event,
        String(payload.service_id),
        payload as unknown as Record<string, unknown>,
        "processed"
      );

      return { client_id: clientId };
    }

    // 3. Handle New/Paid Order or Invoice
    let displayPackageId: string | null = null;
    let defaultVendorPkgCostMinor = "0";

    if (payload.product_id) {
      const displayPkg = await getDisplayPackageByWhmcsPidDb(
        String(payload.product_id)
      );
      if (displayPkg) {
        displayPackageId = displayPkg.display_package_id;
        if (displayPkg.upstream_price_minor) {
          defaultVendorPkgCostMinor = displayPkg.upstream_price_minor;
        }
      }
    }

    const salesAmountMinor = majorToMinorString(payload.amount);
    const profitMinor = calculateProfitMinor(
      salesAmountMinor,
      defaultVendorPkgCostMinor,
      "0"
    );

    const purchaseId = await upsertPurchaseFromWhmcsDb({
      whmcs_order_id: payload.order_id ? String(payload.order_id) : null,
      whmcs_service_id: String(payload.service_id),
      whmcs_invoice_id: payload.invoice_id ? String(payload.invoice_id) : null,
      client_id: clientId,
      display_package_id: displayPackageId,
      status: "pending_fulfillment", // New order appears in pending fulfillment queue
      sales_amount_minor: salesAmountMinor,
      purchase_amount_minor: defaultVendorPkgCostMinor,
      processing_charges_minor: "0",
      profit_amount_minor: profitMinor,
      currency: (payload.currency || "USD").toUpperCase(),
      due_date: payload.due_date ? new Date(payload.due_date).toISOString() : null,
      billing_cycle: payload.billing_cycle || "monthly",
      payment_method: payload.payment_method || null,
    });

    await createSyncLogDb(
      "webhook",
      payload.event,
      String(payload.service_id),
      payload as unknown as Record<string, unknown>,
      "processed"
    );

    return { client_id: clientId, purchase_id: purchaseId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await createSyncLogDb(
      "webhook",
      payload.event || "unknown",
      String(payload.service_id || "unknown"),
      payload as unknown as Record<string, unknown>,
      "failed",
      errorMsg
    );
    throw err;
  }
}
