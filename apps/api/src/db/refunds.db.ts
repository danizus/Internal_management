import { query, withTransaction } from "./pool.js";

export interface RefundRow {
  refund_id: string;
  purchase_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  vendor_id: string | null;
  vendor_name: string | null;
  display_package_id: string | null;
  display_package_name: string | null;
  refund_amount_minor: string;
  currency: string;
  whmcs_transaction_id: string | null;
  reason: string | null;
  refund_date: string;
  created_at: string;
  updated_at: string;
}

export interface ListRefundsFilter {
  purchase_id?: string;
  client_id?: string;
  vendor_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface CreateRefundDbInput {
  purchase_id: string;
  client_id: string;
  vendor_id?: string | null;
  display_package_id?: string | null;
  refund_amount_minor: string;
  currency: string;
  whmcs_transaction_id?: string | null;
  reason?: string | null;
  refund_date?: string;
}

const REFUND_SELECT = `
  r.refund_id::text AS refund_id,
  r.purchase_id::text AS purchase_id,
  r.client_id::text AS client_id,
  c.client_name,
  c.client_email,
  r.vendor_id::text AS vendor_id,
  v.vendor_name,
  r.display_package_id::text AS display_package_id,
  dp.package_name AS display_package_name,
  r.refund_amount_minor::text AS refund_amount_minor,
  r.currency,
  r.whmcs_transaction_id,
  r.reason,
  r.refund_date,
  r.created_at,
  r.updated_at
`;

export async function listRefundsDb(filter: ListRefundsFilter = {}): Promise<RefundRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.purchase_id) {
    values.push(filter.purchase_id);
    conditions.push(`r.purchase_id = $${values.length}`);
  }

  if (filter.client_id) {
    values.push(filter.client_id);
    conditions.push(`r.client_id = $${values.length}`);
  }

  if (filter.vendor_id) {
    values.push(filter.vendor_id);
    conditions.push(`r.vendor_id = $${values.length}`);
  }

  if (filter.from_date) {
    values.push(filter.from_date);
    conditions.push(`r.refund_date >= $${values.length}`);
  }

  if (filter.to_date) {
    values.push(filter.to_date);
    conditions.push(`r.refund_date <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(100, filter.limit && filter.limit > 0 ? filter.limit : 50);
  values.push(limit);

  const sql = `
    SELECT ${REFUND_SELECT}
    FROM refunds r
    JOIN clients c ON c.client_id = r.client_id
    LEFT JOIN vendors v ON v.vendor_id = r.vendor_id
    LEFT JOIN display_packages dp ON dp.display_package_id = r.display_package_id
    ${whereClause}
    ORDER BY r.refund_date DESC
    LIMIT $${values.length}
  `;

  const res = await query<RefundRow>(sql, values);
  return res.rows;
}

export async function getRefundByIdDb(refundId: string): Promise<RefundRow | null> {
  const sql = `
    SELECT ${REFUND_SELECT}
    FROM refunds r
    JOIN clients c ON c.client_id = r.client_id
    LEFT JOIN vendors v ON v.vendor_id = r.vendor_id
    LEFT JOIN display_packages dp ON dp.display_package_id = r.display_package_id
    WHERE r.refund_id = $1
  `;
  const res = await query<RefundRow>(sql, [refundId]);
  return res.rows[0] ?? null;
}

export async function getCumulativeRefundAmountDb(purchaseId: string): Promise<bigint> {
  const res = await query<{ total_refund: string | null }>(
    `SELECT COALESCE(SUM(refund_amount_minor), 0)::text AS total_refund
     FROM refunds
     WHERE purchase_id = $1`,
    [purchaseId]
  );
  return BigInt(res.rows[0]?.total_refund || "0");
}

export async function createRefundTx(input: CreateRefundDbInput): Promise<RefundRow> {
  return withTransaction(async (client) => {
    // 1. Fetch purchase to get sales_amount and status
    const purchaseRes = await client.query<{
      sales_amount_minor: string;
      status: string;
    }>(
      `SELECT sales_amount_minor::text AS sales_amount_minor, status
       FROM purchases
       WHERE purchase_id = $1
       FOR UPDATE`,
      [input.purchase_id]
    );

    if (purchaseRes.rowCount === 0) {
      throw new Error("Purchase not found");
    }

    const salesAmount = BigInt(purchaseRes.rows[0].sales_amount_minor);

    // 2. Fetch current cumulative refunds
    const currentRefundRes = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(refund_amount_minor), 0)::text AS total
       FROM refunds
       WHERE purchase_id = $1`,
      [input.purchase_id]
    );
    const existingRefunds = BigInt(currentRefundRes.rows[0]?.total || "0");
    const newRefundAmount = BigInt(input.refund_amount_minor);
    const totalRefundAfter = existingRefunds + newRefundAmount;

    if (totalRefundAfter > salesAmount) {
      throw new Error(
        `Total refunds (${totalRefundAfter.toString()}) cannot exceed purchase sales amount (${salesAmount.toString()})`
      );
    }

    // 3. Insert refund record
    const insertRes = await client.query<{ refund_id: string }>(
      `INSERT INTO refunds (
        purchase_id,
        client_id,
        vendor_id,
        display_package_id,
        refund_amount_minor,
        currency,
        whmcs_transaction_id,
        reason,
        refund_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
      RETURNING refund_id::text AS refund_id`,
      [
        input.purchase_id,
        input.client_id,
        input.vendor_id ?? null,
        input.display_package_id ?? null,
        input.refund_amount_minor,
        input.currency.toUpperCase(),
        input.whmcs_transaction_id ?? null,
        input.reason ?? null,
        input.refund_date ?? null,
      ]
    );

    const refundId = insertRes.rows[0].refund_id;

    // 4. If full refund, update purchase status to 'refunded'
    if (totalRefundAfter >= salesAmount) {
      await client.query(
        `UPDATE purchases
         SET status = 'refunded', updated_at = NOW()
         WHERE purchase_id = $1`,
        [input.purchase_id]
      );
    }

    // 5. Return complete joined row
    const result = await client.query<RefundRow>(
      `SELECT ${REFUND_SELECT}
       FROM refunds r
       JOIN clients c ON c.client_id = r.client_id
       LEFT JOIN vendors v ON v.vendor_id = r.vendor_id
       LEFT JOIN display_packages dp ON dp.display_package_id = r.display_package_id
       WHERE r.refund_id = $1`,
      [refundId]
    );

    return result.rows[0];
  });
}

export async function deleteRefundTx(refundId: string): Promise<{ refund_id: string; purchase_id: string }> {
  return withTransaction(async (client) => {
    const fetchRes = await client.query<{ purchase_id: string }>(
      `SELECT purchase_id::text AS purchase_id
       FROM refunds
       WHERE refund_id = $1
       FOR UPDATE`,
      [refundId]
    );

    if (fetchRes.rowCount === 0) {
      throw new Error("Refund not found");
    }

    const purchaseId = fetchRes.rows[0].purchase_id;

    await client.query(`DELETE FROM refunds WHERE refund_id = $1`, [refundId]);

    // Check if purchase was 'refunded', see if remaining refunds are now strictly less than sales amount
    const purchaseRes = await client.query<{ sales_amount_minor: string; status: string }>(
      `SELECT sales_amount_minor::text AS sales_amount_minor, status
       FROM purchases
       WHERE purchase_id = $1`,
      [purchaseId]
    );

    if (purchaseRes.rowCount && purchaseRes.rows[0].status === "refunded") {
      const remainingRes = await client.query<{ total: string }>(
        `SELECT COALESCE(SUM(refund_amount_minor), 0)::text AS total
         FROM refunds
         WHERE purchase_id = $1`,
        [purchaseId]
      );
      const remaining = BigInt(remainingRes.rows[0]?.total || "0");
      const sales = BigInt(purchaseRes.rows[0].sales_amount_minor);
      if (remaining < sales) {
        await client.query(
          `UPDATE purchases
           SET status = 'active', updated_at = NOW()
           WHERE purchase_id = $1`,
          [purchaseId]
        );
      }
    }

    return { refund_id: refundId, purchase_id: purchaseId };
  });
}
