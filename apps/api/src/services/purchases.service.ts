import {
  PurchaseRow,
  ListPurchasesFilter,
  CreatePurchaseDbInput,
  UpdatePurchaseDbInput,
  listPurchasesDb,
  getPurchaseByIdDb,
  createPurchaseDb,
  updatePurchaseDb,
  incrementVendorAndPackageSalesDb,
  deletePurchaseDb,
} from "../db/purchases.db.js";
import { withTransaction } from "../db/pool.js";
import { calculateProfitMinor } from "../schemas/common.js";
import { HttpError } from "../middleware/errorHandler.js";

interface PgError extends Error {
  code?: string;
}

function handlePurchasePgError(err: unknown, context: string): never {
  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    throw new HttpError(
      409,
      "A purchase with this WHMCS Service ID (whmcs_service_id) already exists"
    );
  }
  if (pgErr?.code === "23503") {
    if (context === "delete") {
      throw new HttpError(
        409,
        "Cannot delete purchase because refunds reference it"
      );
    }
    throw new HttpError(
      400,
      "Referenced client_id, display_package_id, vendor_id, or package_id does not exist"
    );
  }
  throw err;
}

export interface FulfillPurchaseInput {
  vendor_id: string;
  package_id: string;
  ip_address: string;
  hostname?: string | null;
  purchase_amount_minor: string;
  processing_charges_minor?: string;
}

export async function listPurchasesService(
  filter: ListPurchasesFilter
): Promise<PurchaseRow[]> {
  return listPurchasesDb(filter);
}

export async function getPurchaseByIdService(
  purchaseId: string
): Promise<PurchaseRow> {
  const purchase = await getPurchaseByIdDb(purchaseId);
  if (!purchase) {
    throw new HttpError(404, "Purchase not found");
  }
  return purchase;
}

export async function createPurchaseService(
  input: CreatePurchaseDbInput
): Promise<PurchaseRow> {
  const salesMinor = input.sales_amount_minor;
  const purchaseMinor = input.purchase_amount_minor ?? "0";
  const processingMinor = input.processing_charges_minor ?? "0";
  const profitMinor = calculateProfitMinor(
    salesMinor,
    purchaseMinor,
    processingMinor
  );

  const payload: CreatePurchaseDbInput = {
    ...input,
    sales_amount_minor: salesMinor,
    purchase_amount_minor: purchaseMinor,
    processing_charges_minor: processingMinor,
    profit_amount_minor: profitMinor,
    currency: input.currency ? input.currency.toUpperCase() : "USD",
  };

  try {
    if (
      payload.status === "active" &&
      payload.vendor_id &&
      payload.package_id
    ) {
      return await withTransaction(async (tx) => {
        const created = await createPurchaseDb(payload, tx);
        await incrementVendorAndPackageSalesDb(
          payload.vendor_id!,
          payload.package_id!,
          tx
        );
        return created;
      });
    }

    return await createPurchaseDb(payload);
  } catch (err) {
    handlePurchasePgError(err, "write");
  }
}

export async function updatePurchaseService(
  purchaseId: string,
  input: UpdatePurchaseDbInput
): Promise<PurchaseRow> {
  const existing = await getPurchaseByIdDb(purchaseId);
  if (!existing) {
    throw new HttpError(404, "Purchase not found");
  }

  const salesMinor = input.sales_amount_minor ?? existing.sales_amount_minor;
  const purchaseMinor =
    input.purchase_amount_minor ?? existing.purchase_amount_minor;
  const processingMinor =
    input.processing_charges_minor ?? existing.processing_charges_minor;
  const profitMinor = calculateProfitMinor(
    salesMinor,
    purchaseMinor,
    processingMinor
  );

  const nextStatus = input.status ?? existing.status;
  const nextVendorId = input.vendor_id ?? existing.vendor_id;
  const nextPackageId = input.package_id ?? existing.package_id;

  const shouldIncrementSales =
    existing.status === "pending_fulfillment" &&
    nextStatus === "active" &&
    nextVendorId &&
    nextPackageId;

  const payload: UpdatePurchaseDbInput = {
    ...input,
    profit_amount_minor: profitMinor,
    currency: input.currency ? input.currency.toUpperCase() : undefined,
  };

  try {
    if (shouldIncrementSales) {
      return await withTransaction(async (tx) => {
        const updated = await updatePurchaseDb(purchaseId, payload, tx);
        if (!updated) {
          throw new HttpError(404, "Purchase not found");
        }
        await incrementVendorAndPackageSalesDb(
          nextVendorId,
          nextPackageId,
          tx
        );
        return updated;
      });
    }

    const updated = await updatePurchaseDb(purchaseId, payload);
    if (!updated) {
      throw new HttpError(404, "Purchase not found");
    }
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handlePurchasePgError(err, "write");
  }
}

export async function fulfillPurchaseService(
  purchaseId: string,
  input: FulfillPurchaseInput
): Promise<PurchaseRow> {
  try {
    return await withTransaction(async (tx) => {
      const existing = await getPurchaseByIdDb(purchaseId, tx);
      if (!existing) {
        throw new HttpError(404, "Purchase not found");
      }

      const processingCharges =
        input.processing_charges_minor ?? existing.processing_charges_minor;
      const profitMinor = calculateProfitMinor(
        existing.sales_amount_minor,
        input.purchase_amount_minor,
        processingCharges
      );

      const updated = await updatePurchaseDb(
        purchaseId,
        {
          vendor_id: input.vendor_id,
          package_id: input.package_id,
          ip_address: input.ip_address.trim(),
          hostname: input.hostname?.trim() || null,
          purchase_amount_minor: input.purchase_amount_minor,
          processing_charges_minor: processingCharges,
          profit_amount_minor: profitMinor,
          status: "active",
        },
        tx
      );

      if (!updated) {
        throw new HttpError(404, "Purchase not found");
      }

      if (existing.status === "pending_fulfillment") {
        await incrementVendorAndPackageSalesDb(
          input.vendor_id,
          input.package_id,
          tx
        );
      }

      return updated;
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handlePurchasePgError(err, "write");
  }
}

export async function deletePurchaseService(purchaseId: string): Promise<void> {
  try {
    const deleted = await deletePurchaseDb(purchaseId);
    if (!deleted) {
      throw new HttpError(404, "Purchase not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handlePurchasePgError(err, "delete");
  }
}
