import { query } from "./pool.js";

export interface ExpenseRow {
  expense_id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  expense_title: string;
  expense_description: string | null;
  category: string;
  expense_amount_minor: string;
  currency: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface ListExpensesFilter {
  category?: string;
  vendor_id?: string;
  from_date?: string;
  to_date?: string;
  q?: string;
  limit?: number;
}

export interface CreateExpenseDbInput {
  vendor_id?: string | null;
  expense_title: string;
  expense_description?: string | null;
  category?: string;
  expense_amount_minor: string;
  currency: string;
  expense_date?: string;
}

export interface UpdateExpenseDbInput {
  vendor_id?: string | null;
  expense_title?: string;
  expense_description?: string | null;
  category?: string;
  expense_amount_minor?: string;
  currency?: string;
  expense_date?: string;
}

const EXPENSE_SELECT = `
  e.expense_id::text AS expense_id,
  e.vendor_id::text AS vendor_id,
  v.vendor_name,
  e.expense_title,
  e.expense_description,
  e.category,
  e.expense_amount_minor::text AS expense_amount_minor,
  e.currency,
  e.expense_date,
  e.created_at,
  e.updated_at
`;

export async function listExpensesDb(filter: ListExpensesFilter = {}): Promise<ExpenseRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.category) {
    values.push(filter.category);
    conditions.push(`e.category = $${values.length}`);
  }

  if (filter.vendor_id) {
    values.push(filter.vendor_id);
    conditions.push(`e.vendor_id = $${values.length}`);
  }

  if (filter.from_date) {
    values.push(filter.from_date);
    conditions.push(`e.expense_date >= $${values.length}`);
  }

  if (filter.to_date) {
    values.push(filter.to_date);
    conditions.push(`e.expense_date <= $${values.length}`);
  }

  if (filter.q && filter.q.trim()) {
    values.push(`%${filter.q.trim()}%`);
    conditions.push(
      `(e.expense_title ILIKE $${values.length} OR COALESCE(e.expense_description, '') ILIKE $${values.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(100, filter.limit && filter.limit > 0 ? filter.limit : 50);
  values.push(limit);

  const sql = `
    SELECT ${EXPENSE_SELECT}
    FROM expenses e
    LEFT JOIN vendors v ON v.vendor_id = e.vendor_id
    ${whereClause}
    ORDER BY e.expense_date DESC
    LIMIT $${values.length}
  `;

  const res = await query<ExpenseRow>(sql, values);
  return res.rows;
}

export async function getExpenseByIdDb(expenseId: string): Promise<ExpenseRow | null> {
  const sql = `
    SELECT ${EXPENSE_SELECT}
    FROM expenses e
    LEFT JOIN vendors v ON v.vendor_id = e.vendor_id
    WHERE e.expense_id = $1
  `;
  const res = await query<ExpenseRow>(sql, [expenseId]);
  return res.rows[0] ?? null;
}

export async function createExpenseDb(input: CreateExpenseDbInput): Promise<ExpenseRow> {
  const sql = `
    INSERT INTO expenses (
      vendor_id,
      expense_title,
      expense_description,
      category,
      expense_amount_minor,
      currency,
      expense_date
    )
    VALUES ($1, $2, $3, COALESCE($4, 'general'), $5, $6, COALESCE($7, NOW()))
    RETURNING ${EXPENSE_SELECT}
  `;

  // Use subquery join to return vendor_name cleanly
  const insertSql = `
    WITH inserted AS (
      INSERT INTO expenses (
        vendor_id,
        expense_title,
        expense_description,
        category,
        expense_amount_minor,
        currency,
        expense_date
      )
      VALUES ($1, $2, $3, COALESCE($4, 'general'), $5, $6, COALESCE($7, NOW()))
      RETURNING *
    )
    SELECT
      i.expense_id::text AS expense_id,
      i.vendor_id::text AS vendor_id,
      v.vendor_name,
      i.expense_title,
      i.expense_description,
      i.category,
      i.expense_amount_minor::text AS expense_amount_minor,
      i.currency,
      i.expense_date,
      i.created_at,
      i.updated_at
    FROM inserted i
    LEFT JOIN vendors v ON v.vendor_id = i.vendor_id
  `;

  const res = await query<ExpenseRow>(insertSql, [
    input.vendor_id ?? null,
    input.expense_title,
    input.expense_description ?? null,
    input.category ?? "general",
    input.expense_amount_minor,
    input.currency.toUpperCase(),
    input.expense_date ?? null,
  ]);

  return res.rows[0];
}

export async function updateExpenseDb(
  expenseId: string,
  input: UpdateExpenseDbInput
): Promise<ExpenseRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [expenseId];

  if (input.vendor_id !== undefined) {
    values.push(input.vendor_id);
    setClauses.push(`vendor_id = $${values.length}`);
  }

  if (input.expense_title !== undefined) {
    values.push(input.expense_title);
    setClauses.push(`expense_title = $${values.length}`);
  }

  if (input.expense_description !== undefined) {
    values.push(input.expense_description);
    setClauses.push(`expense_description = $${values.length}`);
  }

  if (input.category !== undefined) {
    values.push(input.category);
    setClauses.push(`category = $${values.length}`);
  }

  if (input.expense_amount_minor !== undefined) {
    values.push(input.expense_amount_minor);
    setClauses.push(`expense_amount_minor = $${values.length}`);
  }

  if (input.currency !== undefined) {
    values.push(input.currency.toUpperCase());
    setClauses.push(`currency = $${values.length}`);
  }

  if (input.expense_date !== undefined) {
    values.push(input.expense_date);
    setClauses.push(`expense_date = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return getExpenseByIdDb(expenseId);
  }

  setClauses.push(`updated_at = NOW()`);

  const updateSql = `
    WITH updated AS (
      UPDATE expenses
      SET ${setClauses.join(", ")}
      WHERE expense_id = $1
      RETURNING *
    )
    SELECT
      u.expense_id::text AS expense_id,
      u.vendor_id::text AS vendor_id,
      v.vendor_name,
      u.expense_title,
      u.expense_description,
      u.category,
      u.expense_amount_minor::text AS expense_amount_minor,
      u.currency,
      u.expense_date,
      u.created_at,
      u.updated_at
    FROM updated u
    LEFT JOIN vendors v ON v.vendor_id = u.vendor_id
  `;

  const res = await query<ExpenseRow>(updateSql, values);
  return res.rows[0] ?? null;
}

export async function deleteExpenseDb(expenseId: string): Promise<boolean> {
  const res = await query(`DELETE FROM expenses WHERE expense_id = $1`, [expenseId]);
  return (res.rowCount ?? 0) > 0;
}
