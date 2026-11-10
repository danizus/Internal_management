import { query, DbClient } from "./pool.js";

export interface PurchaseRow {
  purchase_id: string;
  whmcs_order_id: string | null;
  whmcs_service_id: string | null;
  whmcs_invoice_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  display_package_id: string | null;
  display_package_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  package_id: string | null;
  vendor_package_name: string | null;
  ip_address: string | null;
  hostname: string | null;
  status: string;
  sales_amount_minor: string;
  purchase_amount_minor: string;
  processing_charges_minor: string;
  profit_amount_minor: string;
  currency: string;
  purchase_date: string;
  due_date: string | null;
  billing_cycle: string;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListPurchasesFilter {
  status?: string;
  client_id?: string;
  vendor_id?: string;
  due_within_days?: number;
  q?: string;
}

export interface CreatePurchaseDbInput {
  whmcs_order_id?: string | null;
  whmcs_service_id?: string | null;
  whmcs_invoice_id?: string | null;
  client_id: string;
  display_package_id?: string | null;
  vendor_id?: string | null;
  package_id?: string | null;
  ip_address?: string | null;
  hostname?: string | null;
  status?: string;
  sales_amount_minor: string;
  purchase_amount_minor?: string;
  processing_charges_minor?: string;
  profit_amount_minor?: string;
  currency?: string;
  purchase_date?: string;
  due_date?: string | null;
  billing_cycle?: string;
  payment_method?: string | null;
}

export interface UpdatePurchaseDbInput {
  whmcs_order_id?: string | null;
  whmcs_service_id?: string | null;
  whmcs_invoice_id?: string | null;
  client_id?: string;
  display_package_id?: string | null;
  vendor_id?: string | null;
  package_id?: string | null;
  ip_address?: string | null;
  hostname?: string | null;
  status?: string;
  sales_amount_minor?: string;
  purchase_amount_minor?: string;
  processing_charges_minor?: string;
  profit_amount_minor?: string;
  currency?: string;
  purchase_date?: string;
  due_date?: string | null;
  billing_cycle?: string;
  payment_method?: string | null;
}

const PURCHASE_SELECT = `
  p.purchase_id::text AS purchase_id,
  p.whmcs_order_id::text AS whmcs_order_id,
  p.whmcs_service_id::text AS whmcs_service_id,
  p.whmcs_invoice_id::text AS whmcs_invoice_id,
  p.client_id::text AS client_id,
  c.client_name,
  c.client_email,
  p.display_package_id::text AS display_package_id,
  dp.package_name AS display_package_name,
  p.vendor_id::text AS vendor_id,
  v.vendor_name,
  p.package_id::text AS package_id,
  vp.package_name AS vendor_package_name,
  p.ip_address,
  p.hostname,
  p.status,
  p.sales_amount_minor::text AS sales_amount_minor,
  p.purchase_amount_minor::text AS purchase_amount_minor,
  p.processing_charges_minor::text AS processing_charges_minor,
  p.profit_amount_minor::text AS profit_amount_minor,
  p.currency,
  p.purchase_date,
  p.due_date,
  p.billing_cycle,
  p.payment_method,
  p.created_at,
  p.updated_at
`;

const PURCHASE_JOINS = `
  JOIN clients c ON c.client_id = p.client_id
  LEFT JOIN display_packages dp ON dp.display_package_id = p.display_package_id
  LEFT JOIN vendors v ON v.vendor_id = p.vendor_id
  LEFT JOIN vendor_packages vp ON vp.package_id = p.package_id
`;

export async function listPurchasesDb(
  filter: ListPurchasesFilter = {}
): Promise<PurchaseRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`p.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.client_id) {
    conditions.push(`p.client_id = $${idx++}`);
    params.push(filter.client_id);
  }
  if (filter.vendor_id) {
    conditions.push(`p.vendor_id = $${idx++}`);
    params.push(filter.vendor_id);
  }
  if (filter.due_within_days !== undefined && filter.due_within_days > 0) {
    conditions.push(
      `p.due_date IS NOT NULL AND p.due_date <= NOW() + ($${idx++} * INTERVAL '1 day') AND p.status = 'active'`
    );
    params.push(filter.due_within_days);
  }
  if (filter.q && filter.q.trim()) {
    conditions.push(
      `(c.client_name ILIKE $${idx} OR c.client_email ILIKE $${idx} OR COALESCE(p.ip_address, '') ILIKE $${idx} OR COALESCE(p.hostname, '') ILIKE $${idx} OR COALESCE(dp.package_name, '') ILIKE $${idx} OR COALESCE(vp.package_name, '') ILIKE $${idx})`
    );
    params.push(`%${filter.q.trim()}%`);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query<PurchaseRow>(
    `SELECT ${PURCHASE_SELECT}
     FROM purchases p
     ${PURCHASE_JOINS}
     ${whereClause}
     ORDER BY p.purchase_date DESC, p.purchase_id DESC`,
    params
  );
  return res.rows;
}

export async function getPurchaseByIdDb(
  purchaseId: string,
  client?: DbClient
): Promise<PurchaseRow | null> {
  const exec = client ?? { query };
  const res = await exec.query<PurchaseRow>(
    `SELECT ${PURCHASE_SELECT}
     FROM purchases p
     ${PURCHASE_JOINS}
     WHERE p.purchase_id = $1`,
    [purchaseId]
  );
  return res.rows[0] ?? null;
}

export async function createPurchaseDb(
  input: CreatePurchaseDbInput,
  client?: DbClient
): Promise<PurchaseRow> {
  const exec = client ?? { query };
  const res = await exec.query<PurchaseRow>(
    `WITH inserted AS (
       INSERT INTO purchases (
         whmcs_order_id,
         whmcs_service_id,
         whmcs_invoice_id,
         client_id,
         display_package_id,
         vendor_id,
         package_id,
         ip_address,
         hostname,
         status,
         sales_amount_minor,
         purchase_amount_minor,
         processing_charges_minor,
         profit_amount_minor,
         currency,
         purchase_date,
         due_date,
         billing_cycle,
         payment_method
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16, NOW()), $17, $18, $19)
       RETURNING *
     )
     SELECT ${PURCHASE_SELECT}
     FROM inserted p
     ${PURCHASE_JOINS}`,
    [
      input.whmcs_order_id ?? null,
      input.whmcs_service_id ?? null,
      input.whmcs_invoice_id ?? null,
      input.client_id,
      input.display_package_id ?? null,
      input.vendor_id ?? null,
      input.package_id ?? null,
      input.ip_address ?? null,
      input.hostname ?? null,
      input.status ?? "pending_fulfillment",
      input.sales_amount_minor,
      input.purchase_amount_minor ?? "0",
      input.processing_charges_minor ?? "0",
      input.profit_amount_minor ?? "0",
      input.currency ?? "USD",
      input.purchase_date ?? null,
      input.due_date ?? null,
      input.billing_cycle ?? "monthly",
      input.payment_method ?? null,
    ]
  );
  return res.rows[0];
}

export async function updatePurchaseDb(
  purchaseId: string,
  input: UpdatePurchaseDbInput,
  client?: DbClient
): Promise<PurchaseRow | null> {
  const exec = client ?? { query };
  const fields: string[] = [];
  const params: unknown[] = [purchaseId];
  let idx = 2;

  const entries: [keyof UpdatePurchaseDbInput, unknown][] = [
    ["whmcs_order_id", input.whmcs_order_id],
    ["whmcs_service_id", input.whmcs_service_id],
    ["whmcs_invoice_id", input.whmcs_invoice_id],
    ["client_id", input.client_id],
    ["display_package_id", input.display_package_id],
    ["vendor_id", input.vendor_id],
    ["package_id", input.package_id],
    ["ip_address", input.ip_address],
    ["hostname", input.hostname],
    ["status", input.status],
    ["sales_amount_minor", input.sales_amount_minor],
    ["purchase_amount_minor", input.purchase_amount_minor],
    ["processing_charges_minor", input.processing_charges_minor],
    ["profit_amount_minor", input.profit_amount_minor],
    ["currency", input.currency],
    ["purchase_date", input.purchase_date],
    ["due_date", input.due_date],
    ["billing_cycle", input.billing_cycle],
    ["payment_method", input.payment_method],
  ];

  for (const [col, val] of entries) {
    if (val !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    }
  }

  fields.push(`updated_at = NOW()`);

  const res = await exec.query<PurchaseRow>(
    `WITH updated AS (
       UPDATE purchases
       SET ${fields.join(", ")}
       WHERE purchase_id = $1
       RETURNING *
     )
     SELECT ${PURCHASE_SELECT}
     FROM updated p
     ${PURCHASE_JOINS}`,
    params
  );
  return res.rows[0] ?? null;
}

export async function incrementVendorAndPackageSalesDb(
  vendorId: string,
  packageId: string,
  client: DbClient
): Promise<void> {
  await client.query(
    `UPDATE vendors
     SET vendor_sales_count = vendor_sales_count + 1,
         updated_at = NOW()
     WHERE vendor_id = $1`,
    [vendorId]
  );

  await client.query(
    `UPDATE vendor_packages
     SET package_sales_count = package_sales_count + 1,
         updated_at = NOW()
     WHERE package_id = $1`,
    [packageId]
  );
}

export async function deletePurchaseDb(purchaseId: string): Promise<boolean> {
  const res = await query(`DELETE FROM purchases WHERE purchase_id = $1`, [
    purchaseId,
  ]);
  return (res.rowCount ?? 0) > 0;
}
