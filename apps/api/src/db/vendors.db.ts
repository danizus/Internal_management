import { query } from "./pool.js";

export interface VendorRow {
  vendor_id: string;
  vendor_name: string;
  vendor_website: string | null;
  vendor_rating: string;
  vendor_sales_count: number;
  notes: string | null;
  package_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorDbInput {
  vendor_name: string;
  vendor_website?: string | null;
  vendor_rating?: number;
  notes?: string | null;
}

export interface UpdateVendorDbInput {
  vendor_name?: string;
  vendor_website?: string | null;
  vendor_rating?: number;
  notes?: string | null;
}

export interface VendorPackageRow {
  package_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_rating: string;
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
  package_sales_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListVendorPackagesFilter {
  vendor_id?: string;
  country_id?: string;
  operating_system?: string;
  max_price_minor?: string;
  is_active?: boolean;
  q?: string;
}

export interface CreateVendorPackageDbInput {
  vendor_id: string;
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

export interface UpdateVendorPackageDbInput {
  vendor_id?: string;
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

const VENDOR_SELECT = `
  v.vendor_id::text AS vendor_id,
  v.vendor_name,
  v.vendor_website,
  v.vendor_rating::text AS vendor_rating,
  v.vendor_sales_count,
  v.notes,
  COALESCE(
    (SELECT COUNT(*)::int FROM vendor_packages vp WHERE vp.vendor_id = v.vendor_id),
    0
  ) AS package_count,
  v.created_at,
  v.updated_at
`;

export async function listVendorsDb(search?: string): Promise<VendorRow[]> {
  if (search && search.trim()) {
    const res = await query<VendorRow>(
      `SELECT ${VENDOR_SELECT}
       FROM vendors v
       WHERE v.vendor_name ILIKE $1 OR COALESCE(v.vendor_website, '') ILIKE $1
       ORDER BY v.vendor_name ASC`,
      [`%${search.trim()}%`]
    );
    return res.rows;
  }

  const res = await query<VendorRow>(
    `SELECT ${VENDOR_SELECT}
     FROM vendors v
     ORDER BY v.vendor_name ASC`
  );
  return res.rows;
}

export async function getVendorByIdDb(
  vendorId: string
): Promise<VendorRow | null> {
  const res = await query<VendorRow>(
    `SELECT ${VENDOR_SELECT}
     FROM vendors v
     WHERE v.vendor_id = $1`,
    [vendorId]
  );
  return res.rows[0] ?? null;
}

export async function createVendorDb(
  input: CreateVendorDbInput
): Promise<VendorRow> {
  const res = await query<VendorRow>(
    `INSERT INTO vendors (vendor_name, vendor_website, vendor_rating, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING
       vendor_id::text AS vendor_id,
       vendor_name,
       vendor_website,
       vendor_rating::text AS vendor_rating,
       vendor_sales_count,
       notes,
       0 AS package_count,
       created_at,
       updated_at`,
    [
      input.vendor_name,
      input.vendor_website ?? null,
      input.vendor_rating ?? 0,
      input.notes ?? null,
    ]
  );
  return res.rows[0];
}

export async function updateVendorDb(
  vendorId: string,
  input: UpdateVendorDbInput
): Promise<VendorRow | null> {
  const fields: string[] = [];
  const params: unknown[] = [vendorId];
  let idx = 2;

  if (input.vendor_name !== undefined) {
    fields.push(`vendor_name = $${idx++}`);
    params.push(input.vendor_name);
  }
  if (input.vendor_website !== undefined) {
    fields.push(`vendor_website = $${idx++}`);
    params.push(input.vendor_website);
  }
  if (input.vendor_rating !== undefined) {
    fields.push(`vendor_rating = $${idx++}`);
    params.push(input.vendor_rating);
  }
  if (input.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    params.push(input.notes);
  }

  fields.push(`updated_at = NOW()`);

  const res = await query<VendorRow>(
    `UPDATE vendors v
     SET ${fields.join(", ")}
     WHERE v.vendor_id = $1
     RETURNING ${VENDOR_SELECT}`,
    params
  );
  return res.rows[0] ?? null;
}

export async function deleteVendorDb(vendorId: string): Promise<boolean> {
  const res = await query(`DELETE FROM vendors WHERE vendor_id = $1`, [
    vendorId,
  ]);
  return (res.rowCount ?? 0) > 0;
}

const VENDOR_PACKAGE_SELECT = `
  vp.package_id::text AS package_id,
  vp.vendor_id::text AS vendor_id,
  v.vendor_name,
  v.vendor_rating::text AS vendor_rating,
  vp.country_id::text AS country_id,
  c.country_name,
  c.iso_code,
  vp.package_name,
  vp.cpu_cores,
  vp.ram,
  vp.storage,
  vp.operating_system,
  vp.bandwidth,
  vp.dedicated_ip,
  vp.price_minor::text AS price_minor,
  vp.currency,
  vp.billing_cycle,
  vp.package_sales_count,
  vp.is_active,
  vp.created_at,
  vp.updated_at
`;

export async function listVendorPackagesDb(
  filter: ListVendorPackagesFilter = {}
): Promise<VendorPackageRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.vendor_id) {
    conditions.push(`vp.vendor_id = $${idx++}`);
    params.push(filter.vendor_id);
  }
  if (filter.country_id) {
    conditions.push(`vp.country_id = $${idx++}`);
    params.push(filter.country_id);
  }
  if (filter.operating_system) {
    conditions.push(`vp.operating_system ILIKE $${idx++}`);
    params.push(`%${filter.operating_system}%`);
  }
  if (filter.max_price_minor) {
    conditions.push(`vp.price_minor <= $${idx++}`);
    params.push(filter.max_price_minor);
  }
  if (filter.is_active !== undefined) {
    conditions.push(`vp.is_active = $${idx++}`);
    params.push(filter.is_active);
  }
  if (filter.q && filter.q.trim()) {
    conditions.push(
      `(vp.package_name ILIKE $${idx} OR vp.ram ILIKE $${idx} OR vp.storage ILIKE $${idx} OR COALESCE(vp.cpu_cores, '') ILIKE $${idx} OR v.vendor_name ILIKE $${idx})`
    );
    params.push(`%${filter.q.trim()}%`);
    idx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query<VendorPackageRow>(
    `SELECT ${VENDOR_PACKAGE_SELECT}
     FROM vendor_packages vp
     JOIN vendors v ON v.vendor_id = vp.vendor_id
     JOIN countries c ON c.country_id = vp.country_id
     ${whereClause}
     ORDER BY vp.price_minor ASC, vp.package_id DESC`,
    params
  );
  return res.rows;
}

export async function getVendorPackageByIdDb(
  packageId: string
): Promise<VendorPackageRow | null> {
  const res = await query<VendorPackageRow>(
    `SELECT ${VENDOR_PACKAGE_SELECT}
     FROM vendor_packages vp
     JOIN vendors v ON v.vendor_id = vp.vendor_id
     JOIN countries c ON c.country_id = vp.country_id
     WHERE vp.package_id = $1`,
    [packageId]
  );
  return res.rows[0] ?? null;
}

export async function createVendorPackageDb(
  input: CreateVendorPackageDbInput
): Promise<VendorPackageRow> {
  const res = await query<VendorPackageRow>(
    `WITH inserted AS (
       INSERT INTO vendor_packages (
         vendor_id,
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *
     )
     SELECT
       vp.package_id::text AS package_id,
       vp.vendor_id::text AS vendor_id,
       v.vendor_name,
       v.vendor_rating::text AS vendor_rating,
       vp.country_id::text AS country_id,
       c.country_name,
       c.iso_code,
       vp.package_name,
       vp.cpu_cores,
       vp.ram,
       vp.storage,
       vp.operating_system,
       vp.bandwidth,
       vp.dedicated_ip,
       vp.price_minor::text AS price_minor,
       vp.currency,
       vp.billing_cycle,
       vp.package_sales_count,
       vp.is_active,
       vp.created_at,
       vp.updated_at
     FROM inserted vp
     JOIN vendors v ON v.vendor_id = vp.vendor_id
     JOIN countries c ON c.country_id = vp.country_id`,
    [
      input.vendor_id,
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

export async function updateVendorPackageDb(
  packageId: string,
  input: UpdateVendorPackageDbInput
): Promise<VendorPackageRow | null> {
  const fields: string[] = [];
  const params: unknown[] = [packageId];
  let idx = 2;

  const entries: [keyof UpdateVendorPackageDbInput, unknown][] = [
    ["vendor_id", input.vendor_id],
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

  const res = await query<VendorPackageRow>(
    `WITH updated AS (
       UPDATE vendor_packages
       SET ${fields.join(", ")}
       WHERE package_id = $1
       RETURNING *
     )
     SELECT
       vp.package_id::text AS package_id,
       vp.vendor_id::text AS vendor_id,
       v.vendor_name,
       v.vendor_rating::text AS vendor_rating,
       vp.country_id::text AS country_id,
       c.country_name,
       c.iso_code,
       vp.package_name,
       vp.cpu_cores,
       vp.ram,
       vp.storage,
       vp.operating_system,
       vp.bandwidth,
       vp.dedicated_ip,
       vp.price_minor::text AS price_minor,
       vp.currency,
       vp.billing_cycle,
       vp.package_sales_count,
       vp.is_active,
       vp.created_at,
       vp.updated_at
     FROM updated vp
     JOIN vendors v ON v.vendor_id = vp.vendor_id
     JOIN countries c ON c.country_id = vp.country_id`,
    params
  );
  return res.rows[0] ?? null;
}

export async function deleteVendorPackageDb(
  packageId: string
): Promise<boolean> {
  const res = await query(
    `DELETE FROM vendor_packages WHERE package_id = $1`,
    [packageId]
  );
  return (res.rowCount ?? 0) > 0;
}
