import { query } from "./pool.js";

export interface DisplayPackageRow {
  display_package_id: string;
  whmcs_pid: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  default_vendor_package_id: string | null;
  default_vendor_package_name: string | null;
  upstream_price_minor: string | null;
  upstream_currency: string | null;
  country_id: string;
  country_name: string;
  iso_code: string;
  package_name: string;
  cpu_cores: string | null;
  ram: string;
  storage: string;
  operating_system: string;
  bandwidth: string;
  dedicated_ip: string;
  price_minor: string;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListDisplayPackagesFilter {
  country_id?: string;
  vendor_id?: string;
  whmcs_pid?: string;
  is_active?: boolean;
  q?: string;
}

export interface CreateDisplayPackageDbInput {
  whmcs_pid?: string | null;
  vendor_id?: string | null;
  default_vendor_package_id?: string | null;
  country_id: string;
  package_name: string;
  cpu_cores?: string | null;
  ram: string;
  storage: string;
  operating_system: string;
  bandwidth: string;
  dedicated_ip: string;
  price_minor: string;
  currency: string;
  billing_cycle?: string;
  is_active?: boolean;
}

export interface UpdateDisplayPackageDbInput {
  whmcs_pid?: string | null;
  vendor_id?: string | null;
  default_vendor_package_id?: string | null;
  country_id?: string;
  package_name?: string;
  cpu_cores?: string | null;
  ram?: string;
  storage?: string;
  operating_system?: string;
  bandwidth?: string;
  dedicated_ip?: string;
  price_minor?: string;
  currency?: string;
  billing_cycle?: string;
  is_active?: boolean;
}

const DISPLAY_PACKAGE_SELECT = `
  dp.display_package_id::text AS display_package_id,
  dp.whmcs_pid::text AS whmcs_pid,
  dp.vendor_id::text AS vendor_id,
  v.vendor_name,
  dp.default_vendor_package_id::text AS default_vendor_package_id,
  vp.package_name AS default_vendor_package_name,
  vp.price_minor::text AS upstream_price_minor,
  vp.currency AS upstream_currency,
  dp.country_id::text AS country_id,
  c.country_name,
  c.iso_code,
  dp.package_name,
  dp.cpu_cores,
  dp.ram,
  dp.storage,
  dp.operating_system,
  dp.bandwidth,
  dp.dedicated_ip,
  dp.price_minor::text AS price_minor,
  dp.currency,
  dp.billing_cycle,
  dp.is_active,
  dp.created_at,
  dp.updated_at
`;

const DISPLAY_PACKAGE_JOINS = `
  JOIN countries c ON c.country_id = dp.country_id
  LEFT JOIN vendors v ON v.vendor_id = dp.vendor_id
  LEFT JOIN vendor_packages vp ON vp.package_id = dp.default_vendor_package_id
`;

export async function listDisplayPackagesDb(
  filter: ListDisplayPackagesFilter = {}
): Promise<DisplayPackageRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.country_id) {
    conditions.push(`dp.country_id = $${idx++}`);
    params.push(filter.country_id);
  }
  if (filter.vendor_id) {
    conditions.push(`dp.vendor_id = $${idx++}`);
    params.push(filter.vendor_id);
  }
  if (filter.whmcs_pid) {
    conditions.push(`dp.whmcs_pid = $${idx++}`);
    params.push(filter.whmcs_pid);
  }
  if (filter.is_active !== undefined) {
    conditions.push(`dp.is_active = $${idx++}`);
    params.push(filter.is_active);
  }
  if (filter.q && filter.q.trim()) {
    conditions.push(
      `(dp.package_name ILIKE $${idx} OR dp.ram ILIKE $${idx} OR dp.storage ILIKE $${idx} OR dp.operating_system ILIKE $${idx} OR COALESCE(v.vendor_name, '') ILIKE $${idx})`
    );
    params.push(`%${filter.q.trim()}%`);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query<DisplayPackageRow>(
    `SELECT ${DISPLAY_PACKAGE_SELECT}
     FROM display_packages dp
     ${DISPLAY_PACKAGE_JOINS}
     ${whereClause}
     ORDER BY dp.price_minor ASC, dp.display_package_id DESC`,
    params
  );
  return res.rows;
}

export async function getDisplayPackageByIdDb(
  displayPackageId: string
): Promise<DisplayPackageRow | null> {
  const res = await query<DisplayPackageRow>(
    `SELECT ${DISPLAY_PACKAGE_SELECT}
     FROM display_packages dp
     ${DISPLAY_PACKAGE_JOINS}
     WHERE dp.display_package_id = $1`,
    [displayPackageId]
  );
  return res.rows[0] ?? null;
}

export async function getDisplayPackageByWhmcsPidDb(
  whmcsPid: string
): Promise<DisplayPackageRow | null> {
  const res = await query<DisplayPackageRow>(
    `SELECT ${DISPLAY_PACKAGE_SELECT}
     FROM display_packages dp
     ${DISPLAY_PACKAGE_JOINS}
     WHERE dp.whmcs_pid = $1`,
    [whmcsPid]
  );
  return res.rows[0] ?? null;
}

export async function createDisplayPackageDb(
  input: CreateDisplayPackageDbInput
): Promise<DisplayPackageRow> {
  const res = await query<DisplayPackageRow>(
    `WITH inserted AS (
       INSERT INTO display_packages (
         whmcs_pid,
         vendor_id,
         default_vendor_package_id,
         country_id,
         package_name,
         cpu_cores,
         ram,
         storage,
         operating_system,
         bandwidth,
         dedicated_ip,
         price_minor,
         currency,
         billing_cycle,
         is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *
     )
     SELECT ${DISPLAY_PACKAGE_SELECT}
     FROM inserted dp
     ${DISPLAY_PACKAGE_JOINS}`,
    [
      input.whmcs_pid ?? null,
      input.vendor_id ?? null,
      input.default_vendor_package_id ?? null,
      input.country_id,
      input.package_name,
      input.cpu_cores ?? null,
      input.ram,
      input.storage,
      input.operating_system,
      input.bandwidth,
      input.dedicated_ip,
      input.price_minor,
      input.currency,
      input.billing_cycle ?? "monthly",
      input.is_active ?? true,
    ]
  );
  return res.rows[0];
}

export async function updateDisplayPackageDb(
  displayPackageId: string,
  input: UpdateDisplayPackageDbInput
): Promise<DisplayPackageRow | null> {
  const fields: string[] = [];
  const params: unknown[] = [displayPackageId];
  let idx = 2;

  const entries: [keyof UpdateDisplayPackageDbInput, unknown][] = [
    ["whmcs_pid", input.whmcs_pid],
    ["vendor_id", input.vendor_id],
    ["default_vendor_package_id", input.default_vendor_package_id],
    ["country_id", input.country_id],
    ["package_name", input.package_name],
    ["cpu_cores", input.cpu_cores],
    ["ram", input.ram],
    ["storage", input.storage],
    ["operating_system", input.operating_system],
    ["bandwidth", input.bandwidth],
    ["dedicated_ip", input.dedicated_ip],
    ["price_minor", input.price_minor],
    ["currency", input.currency],
    ["billing_cycle", input.billing_cycle],
    ["is_active", input.is_active],
  ];

  for (const [col, val] of entries) {
    if (val !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    }
  }

  fields.push(`updated_at = NOW()`);

  const res = await query<DisplayPackageRow>(
    `WITH updated AS (
       UPDATE display_packages
       SET ${fields.join(", ")}
       WHERE display_package_id = $1
       RETURNING *
     )
     SELECT ${DISPLAY_PACKAGE_SELECT}
     FROM updated dp
     ${DISPLAY_PACKAGE_JOINS}`,
    params
  );
  return res.rows[0] ?? null;
}

export async function deleteDisplayPackageDb(
  displayPackageId: string
): Promise<boolean> {
  const res = await query(
    `DELETE FROM display_packages WHERE display_package_id = $1`,
    [displayPackageId]
  );
  return (res.rowCount ?? 0) > 0;
}
