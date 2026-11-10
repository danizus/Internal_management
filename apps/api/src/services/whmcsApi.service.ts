import { env } from "../config/env.js";
import { getDisplayPackageByWhmcsPidDb } from "../db/displayPackages.db.js";
import {
  createSyncLogDb,
  upsertClientFromWhmcsDb,
  upsertPurchaseFromWhmcsDb,
} from "../db/whmcsSync.db.js";
import { majorToMinorString } from "./whmcsWebhook.service.js";
import { calculateProfitMinor } from "../schemas/common.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface WhmcsSyncResult {
  orders_synced: number;
  clients_upserted: number;
  errors: string[];
}

export async function callWhmcsApi<T = Record<string, unknown>>(
  action: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  if (!env.WHMCS_API_URL) {
    throw new HttpError(
      400,
      "WHMCS_API_URL is not configured in .env. Please set it before running sync."
    );
  }

  const bodyData = new URLSearchParams({
    action,
    responsetype: "json",
    identifier: env.WHMCS_API_IDENTIFIER,
    secret: env.WHMCS_API_SECRET,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const response = await fetch(env.WHMCS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyData.toString(),
  });

  if (!response.ok) {
    throw new HttpError(
      502,
      `WHMCS API responded with status ${response.status}: ${response.statusText}`
    );
  }

  const json = (await response.json()) as {
    result?: string;
    message?: string;
    [key: string]: unknown;
  };

  if (json.result === "error") {
    throw new HttpError(
      502,
      `WHMCS API Error: ${json.message || "Unknown error"}`
    );
  }

  return json as T;
}

export async function syncFromWhmcsService(): Promise<WhmcsSyncResult> {
  const result: WhmcsSyncResult = {
    orders_synced: 0,
    clients_upserted: 0,
    errors: [],
  };

  try {
    // 1. Fetch recent orders from WHMCS
    const ordersRes = await callWhmcsApi<{
      orders?: {
        order?: Array<{
          id: number;
          ordernum: number;
          userid: number;
          date: string;
          amount: string;
          paymentmethod: string;
          status: string;
          lineitems?: {
            lineitem?: Array<{
              relid: number; // service id
              productid?: number;
              producttype?: string;
            }>;
          };
        }>;
      };
    }>("GetOrders", { limitnum: 50 });

    const orders = ordersRes.orders?.order || [];

    for (const order of orders) {
      try {
        // 2. Fetch full client details
        const clientRes = await callWhmcsApi<{
          client?: {
            id: number;
            firstname: string;
            lastname: string;
            companyname?: string;
            email: string;
            phonenumber?: string;
            status: string;
          };
        }>("GetClientsDetails", { clientid: order.userid });

        const clientData = clientRes.client;
        if (!clientData) {
          result.errors.push(`Could not find client details for WHMCS user ${order.userid}`);
          continue;
        }

        const clientId = await upsertClientFromWhmcsDb({
          whmcs_client_id: String(clientData.id),
          client_name: `${clientData.firstname} ${clientData.lastname}`.trim(),
          client_email: clientData.email.trim().toLowerCase(),
          client_phone: clientData.phonenumber?.trim() || null,
          company_name: clientData.companyname?.trim() || null,
          status: clientData.status.toLowerCase() === "active" ? "active" : "inactive",
        });
        result.clients_upserted += 1;

        // 3. Ingest order line items / services
        const lineItems = order.lineitems?.lineitem || [];
        for (const item of lineItems) {
          const serviceId = item.relid;
          if (!serviceId) continue;

          let displayPackageId: string | null = null;
          let upstreamCostMinor = "0";

          if (item.productid) {
            const displayPkg = await getDisplayPackageByWhmcsPidDb(
              String(item.productid)
            );
            if (displayPkg) {
              displayPackageId = displayPkg.display_package_id;
              if (displayPkg.upstream_price_minor) {
                upstreamCostMinor = displayPkg.upstream_price_minor;
              }
            }
          }

          const salesAmountMinor = majorToMinorString(order.amount);
          const profitMinor = calculateProfitMinor(
            salesAmountMinor,
            upstreamCostMinor,
            "0"
          );

          await upsertPurchaseFromWhmcsDb({
            whmcs_order_id: String(order.id),
            whmcs_service_id: String(serviceId),
            client_id: clientId,
            display_package_id: displayPackageId,
            status: order.status === "Active" ? "active" : "pending_fulfillment",
            sales_amount_minor: salesAmountMinor,
            purchase_amount_minor: upstreamCostMinor,
            processing_charges_minor: "0",
            profit_amount_minor: profitMinor,
            currency: "USD",
            billing_cycle: "monthly",
            payment_method: order.paymentmethod,
          });

          result.orders_synced += 1;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Error syncing WHMCS order ${order.id}: ${msg}`);
      }
    }

    await createSyncLogDb(
      "api_pull",
      "manual_sync",
      null,
      result as unknown as Record<string, unknown>,
      result.errors.length === 0 ? "processed" : "failed",
      result.errors.join("; ") || null
    );

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await createSyncLogDb(
      "api_pull",
      "manual_sync",
      null,
      {},
      "failed",
      errorMsg
    );
    throw err;
  }
}
