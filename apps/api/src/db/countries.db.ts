import { query } from "./pool.js";

export interface CountryRow {
  country_id: string;
  country_name: string;
  iso_code: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCountryDbInput {
  country_name: string;
  iso_code: string;
}

export interface UpdateCountryDbInput {
  country_name?: string;
  iso_code?: string;
}

const COUNTRY_COLUMNS = `
  country_id::text AS country_id,
  country_name,
  iso_code,
  created_at,
  updated_at
`;

export async function listCountriesDb(): Promise<CountryRow[]> {
  const res = await query<CountryRow>(
    `SELECT ${COUNTRY_COLUMNS}
     FROM countries
     ORDER BY country_name ASC`
  );
  return res.rows;
}

export async function getCountryByIdDb(
  countryId: string
): Promise<CountryRow | null> {
  const res = await query<CountryRow>(
    `SELECT ${COUNTRY_COLUMNS}
     FROM countries
     WHERE country_id = $1`,
    [countryId]
  );
  return res.rows[0] ?? null;
}

export async function createCountryDb(
  input: CreateCountryDbInput
): Promise<CountryRow> {
  const res = await query<CountryRow>(
    `INSERT INTO countries (country_name, iso_code)
     VALUES ($1, $2)
     RETURNING ${COUNTRY_COLUMNS}`,
    [input.country_name, input.iso_code]
  );
  return res.rows[0];
}

export async function updateCountryDb(
  countryId: string,
  input: UpdateCountryDbInput
): Promise<CountryRow | null> {
  const res = await query<CountryRow>(
    `UPDATE countries
     SET country_name = COALESCE($2, country_name),
         iso_code = COALESCE($3, iso_code),
         updated_at = NOW()
     WHERE country_id = $1
     RETURNING ${COUNTRY_COLUMNS}`,
    [countryId, input.country_name ?? null, input.iso_code ?? null]
  );
  return res.rows[0] ?? null;
}

export async function deleteCountryDb(countryId: string): Promise<boolean> {
  const res = await query(
    `DELETE FROM countries WHERE country_id = $1`,
    [countryId]
  );
  return (res.rowCount ?? 0) > 0;
}
