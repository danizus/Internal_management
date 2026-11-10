import { query, withTransaction } from "./pool.js";

export interface WhmcsSyncLogRow {
  sync_id: string;
  source: "webhook" | "api_pull";
  event_type: string;
  external_id: string | null;
  payload: Record<string, unknown>;
  status: "processed" | "failed" | "ignored";
  error_message: string | null;
  created_at: string;
}

export interface UpsertWhmcsClientInput {
  whmcs_client_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  company_name?: string | null;
  status?: string;
}

export interface UpsertWhmcsPurchaseInput {
  whmcs_order_id?: string | null;
  whmcs_service_id: string;
  whmcs_invoice_id?: string | null;
  client_id: string;
  display_package_id?: string | null;
  status: string;
  sales_amount_minor: string;
  purchase_amount_minor?: string;
  processing_charges_minor?: string;
  profit_amount_minor: string;
  currency: string;
  due_date?: string | null;
  billing_cycle: string;
  payment_method?: string | null;
}

export async function createSyncLogDb(
  source: "webhook" | "api_pull",
  eventType: string,
  externalId: string | null,
  payload: Record<string, unknown>,
  status: "processed" | "failed" | "ignored",
  errorMessage: string | null = null
): Promise<WhmcsSyncLogRow> {
  const res = await query<WhmcsSyncLogRow>(
    `INSERT INTO whmcs_sync_logs (source, event_type, external_id, payload, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       sync_id::text AS sync_id,
       source,
       event_type,
       external_id,
       payload,
       status,
       error_message,
       created_at`,
    [source, eventType, externalId, JSON.stringify(payload), status, errorMessage]
  );
  return res.rows[0];
}

export async function listSyncLogsDb(limit = 50): Promise<WhmcsSyncLogRow[]> {
  const res = await query<WhmcsSyncLogRow>(
    `SELECT
       sync_id::text AS sync_id,
       source,
       event_type,
       external_id,
       payload,
       status,
       error_message,
       created_at
     FROM whmcs_sync_logs
     ORDER BY created_at DESC, sync_id DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

/**
 * Idempotently upserts a client by whmcs_client_id.
 */
export async function upsertClientFromWhmcsDb(
  input: UpsertWhmcsClientInput
): Promise<string> {
  const res = await query<{ client_id: string }>(
    `INSERT INTO clients (
       whmcs_client_id,
       client_name,
       client_email,
       client_phone,
       company_name,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (whmcs_client_id) DO UPDATE
     SET client_name = EXCLUDED.client_name,
         client_email = EXCLUDED.client_email,
         client_phone = COALESCE(EXCLUDED.client_phone, clients.client_phone),
         company_name = COALESCE(EXCLUDED.company_name, clients.company_name),
         updated_at = NOW()
     RETURNING client_id::text AS client_id`,
    [
      input.whmcs_client_id,
      input.client_name,
      input.client_email.toLowerCase(),
      input.client_phone ?? null,
      input.company_name ?? null,
      input.status ?? "active",
    ]
  );
  return res.rows[0].client_id;
}

/**
 * Idempotently upserts a purchase by whmcs_service_id.
 */
export async function upsertPurchaseFromWhmcsDb(
  input: UpsertWhmcsPurchaseInput
): Promise<string> {
  return withTransaction(async (tx) => {
    const res = await tx.query<{ purchase_id: string }>(
      `INSERT INTO purchases (
         whmcs_order_id,
         whmcs_service_id,
         whmcs_invoice_id,
         client_id,
         display_package_id,
         status,
         sales_amount_minor,
         purchase_amount_minor,
         processing_charges_minor,
         profit_amount_minor,
         currency,
         due_date,
         billing_cycle,
         payment_method
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (whmcs_service_id) DO UPDATE
       SET whmcs_order_id = COALESCE(EXCLUDED.whmcs_order_id, purchases.whmcs_order_id),
           whmcs_invoice_id = COALESCE(EXCLUDED.whmcs_invoice_id, purchases.whmcs_invoice_id),
           sales_amount_minor = EXCLUDED.sales_amount_minor,
           due_date = COALESCE(EXCLUDED.due_date, purchases.due_date),
           billing_cycle = EXCLUDED.billing_cycle,
           payment_method = COALESCE(EXCLUDED.payment_method, purchases.payment_method),
           profit_amount_minor = EXCLUDED.sales_amount_minor - purchases.purchase_amount_minor - purchases.processing_charges_minor,
           updated_at = NOW()
       RETURNING purchase_id::text AS purchase_id`,
      [
        input.whmcs_order_id ?? null,
        input.whmcs_service_id,
        input.whmcs_invoice_id ?? null,
        input.client_id,
        input.display_package_id ?? null,
        input.status,
        input.sales_amount_minor,
        input.purchase_amount_minor ?? "0",
        input.processing_charges_minor ?? "0",
        input.profit_amount_minor,
        input.currency,
        input.due_date ?? null,
        input.billing_cycle,
        input.payment_method ?? null,
      ]
    );

    return res.rows[0].purchase_id;
  });
}

/**
 * Updates status of an existing purchase by whmcs_service_id (e.g. for suspension/cancellation).
 */
export async function updatePurchaseStatusByWhmcsServiceIdDb(
  whmcsServiceId: string,
  status: string
): Promise<boolean> {
  const res = await query(
    `UPDATE purchases
     SET status = $2,
         updated_at = NOW()
     WHERE whmcs_service_id = $1`,
    [whmcsServiceId, status]
  );
  return (res.rowCount ?? 0) > 0;
}
