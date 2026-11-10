import { query } from "./pool.js";

export interface ExecutiveOverview {
  currency: string;
  gross_sales_minor: string;
  wholesale_cogs_minor: string;
  gateway_charges_minor: string;
  refunds_minor: string;
  expenses_minor: string;
  net_profit_minor: string;
  profit_margin_pct: number;
  active_vps_count: number;
  pending_fulfillment_count: number;
  total_clients_count: number;
}

export interface VendorFinancialPerformance {
  vendor_id: string;
  vendor_name: string;
  active_orders_count: number;
  gross_sales_minor: string;
  wholesale_cost_minor: string;
  vendor_expenses_minor: string;
  net_vendor_profit_minor: string;
  currency: string;
}

export interface CashflowMonthPoint {
  year_month: string;
  sales_minor: string;
  costs_minor: string;
  refunds_minor: string;
  expenses_minor: string;
  net_profit_minor: string;
  currency: string;
}

export async function getExecutiveOverviewDb(
  currency = "USD",
  fromDate?: string,
  toDate?: string
): Promise<ExecutiveOverview> {
  const values: unknown[] = [currency.toUpperCase()];
  const purchaseDateCond: string[] = ["currency = $1"];
  const refundDateCond: string[] = ["currency = $1"];
  const expenseDateCond: string[] = ["currency = $1"];

  if (fromDate) {
    values.push(fromDate);
    const paramIdx = `$${values.length}`;
    purchaseDateCond.push(`purchase_date >= ${paramIdx}`);
    refundDateCond.push(`refund_date >= ${paramIdx}`);
    expenseDateCond.push(`expense_date >= ${paramIdx}`);
  }

  if (toDate) {
    values.push(toDate);
    const paramIdx = `$${values.length}`;
    purchaseDateCond.push(`purchase_date <= ${paramIdx}`);
    refundDateCond.push(`refund_date <= ${paramIdx}`);
    expenseDateCond.push(`expense_date <= ${paramIdx}`);
  }

  // 1. Aggregate purchases
  const purchaseSql = `
    SELECT
      COALESCE(SUM(sales_amount_minor), 0)::text AS gross_sales_minor,
      COALESCE(SUM(purchase_amount_minor), 0)::text AS wholesale_cogs_minor,
      COALESCE(SUM(processing_charges_minor), 0)::text AS gateway_charges_minor
    FROM purchases
    WHERE ${purchaseDateCond.join(" AND ")}
  `;
  const purchaseRes = await query<{
    gross_sales_minor: string;
    wholesale_cogs_minor: string;
    gateway_charges_minor: string;
  }>(purchaseSql, values);

  // 2. Aggregate refunds
  const refundSql = `
    SELECT COALESCE(SUM(refund_amount_minor), 0)::text AS refunds_minor
    FROM refunds
    WHERE ${refundDateCond.join(" AND ")}
  `;
  const refundRes = await query<{ refunds_minor: string }>(refundSql, values);

  // 3. Aggregate expenses
  const expenseSql = `
    SELECT COALESCE(SUM(expense_amount_minor), 0)::text AS expenses_minor
    FROM expenses
    WHERE ${expenseDateCond.join(" AND ")}
  `;
  const expenseRes = await query<{ expenses_minor: string }>(expenseSql, values);

  // 4. Counts (active fleet, pending fulfillment, total active clients)
  const countsRes = await query<{
    active_vps_count: number;
    pending_fulfillment_count: number;
    total_clients_count: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM purchases WHERE status = 'active') AS active_vps_count,
      (SELECT COUNT(*)::int FROM purchases WHERE status = 'pending_fulfillment') AS pending_fulfillment_count,
      (SELECT COUNT(*)::int FROM clients WHERE status = 'active') AS total_clients_count
  `);

  const grossSales = BigInt(purchaseRes.rows[0]?.gross_sales_minor || "0");
  const wholesaleCogs = BigInt(purchaseRes.rows[0]?.wholesale_cogs_minor || "0");
  const gatewayCharges = BigInt(purchaseRes.rows[0]?.gateway_charges_minor || "0");
  const refunds = BigInt(refundRes.rows[0]?.refunds_minor || "0");
  const expenses = BigInt(expenseRes.rows[0]?.expenses_minor || "0");

  const netProfit = grossSales - wholesaleCogs - gatewayCharges - refunds - expenses;

  // Margin % = (Net Profit / Gross Sales) * 100
  let marginPct = 0;
  if (grossSales > 0n) {
    marginPct = Number((netProfit * 10000n) / grossSales) / 100;
  }

  return {
    currency: currency.toUpperCase(),
    gross_sales_minor: grossSales.toString(),
    wholesale_cogs_minor: wholesaleCogs.toString(),
    gateway_charges_minor: gatewayCharges.toString(),
    refunds_minor: refunds.toString(),
    expenses_minor: expenses.toString(),
    net_profit_minor: netProfit.toString(),
    profit_margin_pct: marginPct,
    active_vps_count: countsRes.rows[0]?.active_vps_count || 0,
    pending_fulfillment_count: countsRes.rows[0]?.pending_fulfillment_count || 0,
    total_clients_count: countsRes.rows[0]?.total_clients_count || 0,
  };
}

export async function getVendorFinancialPerformanceDb(
  currency = "USD"
): Promise<VendorFinancialPerformance[]> {
  const sql = `
    SELECT
      v.vendor_id::text AS vendor_id,
      v.vendor_name,
      COALESCE(
        (SELECT COUNT(*)::int FROM purchases p WHERE p.vendor_id = v.vendor_id AND p.status = 'active'),
        0
      ) AS active_orders_count,
      COALESCE(
        (SELECT SUM(p.sales_amount_minor)::text FROM purchases p WHERE p.vendor_id = v.vendor_id AND p.currency = $1),
        '0'
      ) AS gross_sales_minor,
      COALESCE(
        (SELECT SUM(p.purchase_amount_minor)::text FROM purchases p WHERE p.vendor_id = v.vendor_id AND p.currency = $1),
        '0'
      ) AS wholesale_cost_minor,
      COALESCE(
        (SELECT SUM(e.expense_amount_minor)::text FROM expenses e WHERE e.vendor_id = v.vendor_id AND e.currency = $1),
        '0'
      ) AS vendor_expenses_minor,
      $1 AS currency
    FROM vendors v
    ORDER BY v.vendor_name ASC
  `;

  const res = await query<{
    vendor_id: string;
    vendor_name: string;
    active_orders_count: number;
    gross_sales_minor: string;
    wholesale_cost_minor: string;
    vendor_expenses_minor: string;
    currency: string;
  }>(sql, [currency.toUpperCase()]);

  return res.rows.map((row) => {
    const sales = BigInt(row.gross_sales_minor);
    const costs = BigInt(row.wholesale_cost_minor);
    const expenses = BigInt(row.vendor_expenses_minor);
    const netProfit = sales - costs - expenses;
    return {
      ...row,
      net_vendor_profit_minor: netProfit.toString(),
    };
  });
}

export async function getMonthlyCashflowTrendDb(
  currency = "USD",
  monthsCount = 6
): Promise<CashflowMonthPoint[]> {
  const safeMonths = Math.min(12, Math.max(1, monthsCount));

  const sql = `
    WITH months AS (
      SELECT TO_CHAR(date_trunc('month', d), 'YYYY-MM') AS year_month,
             date_trunc('month', d) AS start_date,
             date_trunc('month', d) + interval '1 month' AS end_date
      FROM generate_series(
        date_trunc('month', NOW() - ($2 - 1) * interval '1 month'),
        date_trunc('month', NOW()),
        interval '1 month'
      ) d
    )
    SELECT
      m.year_month,
      COALESCE(
        (SELECT SUM(p.sales_amount_minor)::text
         FROM purchases p
         WHERE p.currency = $1
           AND p.purchase_date >= m.start_date
           AND p.purchase_date < m.end_date),
        '0'
      ) AS sales_minor,
      COALESCE(
        (SELECT SUM(p.purchase_amount_minor + p.processing_charges_minor)::text
         FROM purchases p
         WHERE p.currency = $1
           AND p.purchase_date >= m.start_date
           AND p.purchase_date < m.end_date),
        '0'
      ) AS costs_minor,
      COALESCE(
        (SELECT SUM(r.refund_amount_minor)::text
         FROM refunds r
         WHERE r.currency = $1
           AND r.refund_date >= m.start_date
           AND r.refund_date < m.end_date),
        '0'
      ) AS refunds_minor,
      COALESCE(
        (SELECT SUM(e.expense_amount_minor)::text
         FROM expenses e
         WHERE e.currency = $1
           AND e.expense_date >= m.start_date
           AND e.expense_date < m.end_date),
        '0'
      ) AS expenses_minor,
      $1 AS currency
    FROM months m
    ORDER BY m.year_month ASC
  `;

  const res = await query<{
    year_month: string;
    sales_minor: string;
    costs_minor: string;
    refunds_minor: string;
    expenses_minor: string;
    currency: string;
  }>(sql, [currency.toUpperCase(), safeMonths]);

  return res.rows.map((row) => {
    const sales = BigInt(row.sales_minor);
    const costs = BigInt(row.costs_minor);
    const refunds = BigInt(row.refunds_minor);
    const expenses = BigInt(row.expenses_minor);
    const netProfit = sales - costs - refunds - expenses;
    return {
      ...row,
      net_profit_minor: netProfit.toString(),
    };
  });
}
