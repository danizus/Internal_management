import { query } from "./pool.js";

export interface ClientRow {
  client_id: string;
  whmcs_client_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  status: string;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListClientsFilter {
  status?: string;
  q?: string;
}

export interface CreateClientDbInput {
  whmcs_client_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  company_name?: string | null;
  status?: string;
}

export interface UpdateClientDbInput {
  whmcs_client_id?: string | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string | null;
  company_name?: string | null;
  status?: string;
}

const CLIENT_SELECT = `
  c.client_id::text AS client_id,
  c.whmcs_client_id::text AS whmcs_client_id,
  c.client_name,
  c.client_email,
  c.client_phone,
  c.company_name,
  c.status,
  COALESCE(
    (SELECT COUNT(*)::int FROM purchases p WHERE p.client_id = c.client_id),
    0
  ) AS purchase_count,
  c.created_at,
  c.updated_at
`;

export async function listClientsDb(
  filter: ListClientsFilter = {}
): Promise<ClientRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.q && filter.q.trim()) {
    conditions.push(
      `(c.client_name ILIKE $${idx} OR c.client_email ILIKE $${idx} OR COALESCE(c.company_name, '') ILIKE $${idx} OR COALESCE(c.client_phone, '') ILIKE $${idx})`
    );
    params.push(`%${filter.q.trim()}%`);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query<ClientRow>(
    `SELECT ${CLIENT_SELECT}
     FROM clients c
     ${whereClause}
     ORDER BY c.created_at DESC, c.client_id DESC`,
    params
  );
  return res.rows;
}

export async function getClientByIdDb(
  clientId: string
): Promise<ClientRow | null> {
  const res = await query<ClientRow>(
    `SELECT ${CLIENT_SELECT}
     FROM clients c
     WHERE c.client_id = $1`,
    [clientId]
  );
  return res.rows[0] ?? null;
}

export async function getClientByWhmcsIdDb(
  whmcsClientId: string
): Promise<ClientRow | null> {
  const res = await query<ClientRow>(
    `SELECT ${CLIENT_SELECT}
     FROM clients c
     WHERE c.whmcs_client_id = $1`,
    [whmcsClientId]
  );
  return res.rows[0] ?? null;
}

export async function createClientDb(
  input: CreateClientDbInput
): Promise<ClientRow> {
  const res = await query<ClientRow>(
    `INSERT INTO clients (
       whmcs_client_id,
       client_name,
       client_email,
       client_phone,
       company_name,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       client_id::text AS client_id,
       whmcs_client_id::text AS whmcs_client_id,
       client_name,
       client_email,
       client_phone,
       company_name,
       status,
       0 AS purchase_count,
       created_at,
       updated_at`,
    [
      input.whmcs_client_id ?? null,
      input.client_name,
      input.client_email,
      input.client_phone ?? null,
      input.company_name ?? null,
      input.status ?? "active",
    ]
  );
  return res.rows[0];
}

export async function updateClientDb(
  clientId: string,
  input: UpdateClientDbInput
): Promise<ClientRow | null> {
  const fields: string[] = [];
  const params: unknown[] = [clientId];
  let idx = 2;

  const entries: [keyof UpdateClientDbInput, unknown][] = [
    ["whmcs_client_id", input.whmcs_client_id],
    ["client_name", input.client_name],
    ["client_email", input.client_email],
    ["client_phone", input.client_phone],
    ["company_name", input.company_name],
    ["status", input.status],
  ];

  for (const [col, val] of entries) {
    if (val !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    }
  }

  fields.push(`updated_at = NOW()`);

  const res = await query<ClientRow>(
    `UPDATE clients c
     SET ${fields.join(", ")}
     WHERE c.client_id = $1
     RETURNING ${CLIENT_SELECT}`,
    params
  );
  return res.rows[0] ?? null;
}

export async function deleteClientDb(clientId: string): Promise<boolean> {
  const res = await query(`DELETE FROM clients WHERE client_id = $1`, [clientId]);
  return (res.rowCount ?? 0) > 0;
}
