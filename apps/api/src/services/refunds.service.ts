import {
  RefundRow,
  ListRefundsFilter,
  listRefundsDb,
  getRefundByIdDb,
  createRefundTx,
  deleteRefundTx,
} from "../db/refunds.db.js";
import { getPurchaseByIdDb } from "../db/purchases.db.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface CreateRefundServiceInput {
  purchase_id: string;
  client_id?: string;
  vendor_id?: string | null;
  display_package_id?: string | null;
  refund_amount_minor: string;
  currency?: string;
  whmcs_transaction_id?: string | null;
  reason?: string | null;
  refund_date?: string;
}

export async function listRefundsService(
  filter: ListRefundsFilter = {}
): Promise<RefundRow[]> {
  return listRefundsDb(filter);
}

export async function getRefundByIdService(refundId: string): Promise<RefundRow> {
  const refund = await getRefundByIdDb(refundId);
  if (!refund) {
    throw new HttpError(404, "Refund record not found");
  }
  return refund;
}

export async function createRefundService(
  input: CreateRefundServiceInput
): Promise<RefundRow> {
  // 1. Verify purchase exists
  const purchase = await getPurchaseByIdDb(input.purchase_id);
  if (!purchase) {
    throw new HttpError(404, "Target purchase not found");
  }

  // 2. Auto-fill omitted fields from purchase
  const resolvedClientId = input.client_id || purchase.client_id;
  const resolvedVendorId =
    input.vendor_id !== undefined ? input.vendor_id : purchase.vendor_id;
  const resolvedDisplayPackageId =
    input.display_package_id !== undefined
      ? input.display_package_id
      : purchase.display_package_id;
  const resolvedCurrency = (input.currency || purchase.currency).toUpperCase();

  try {
    return await createRefundTx({
      purchase_id: input.purchase_id,
      client_id: resolvedClientId,
      vendor_id: resolvedVendorId,
      display_package_id: resolvedDisplayPackageId,
      refund_amount_minor: input.refund_amount_minor,
      currency: resolvedCurrency,
      whmcs_transaction_id: input.whmcs_transaction_id,
      reason: input.reason,
      refund_date: input.refund_date,
    });
  } catch (err) {
    const message = (err as Error)?.message || "Failed to issue refund";
    if (message.includes("cannot exceed purchase sales amount")) {
      throw new HttpError(400, message);
    }
    throw err;
  }
}

export async function deleteRefundService(
  refundId: string
): Promise<{ refund_id: string; purchase_id: string }> {
  try {
    return await deleteRefundTx(refundId);
  } catch (err) {
    const message = (err as Error)?.message || "";
    if (message.includes("not found")) {
      throw new HttpError(404, "Refund not found");
    }
    throw err;
  }
}
