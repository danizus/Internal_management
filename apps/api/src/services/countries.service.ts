import {
  CountryRow,
  CreateCountryDbInput,
  UpdateCountryDbInput,
  listCountriesDb,
  getCountryByIdDb,
  createCountryDb,
  updateCountryDb,
  deleteCountryDb,
} from "../db/countries.db.js";
import { HttpError } from "../middleware/errorHandler.js";

interface PgError extends Error {
  code?: string;
}

function handleCountryPgError(err: unknown): never {
  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    throw new HttpError(
      409,
      "Country with this name or ISO code already exists"
    );
  }
  if (pgErr?.code === "23503") {
    throw new HttpError(
      409,
      "Cannot delete country because one or more packages reference it"
    );
  }
  throw err;
}

export async function listCountriesService(): Promise<CountryRow[]> {
  return listCountriesDb();
}

export async function getCountryByIdService(
  countryId: string
): Promise<CountryRow> {
  const country = await getCountryByIdDb(countryId);
  if (!country) {
    throw new HttpError(404, "Country not found");
  }
  return country;
}

export async function createCountryService(
  input: CreateCountryDbInput
): Promise<CountryRow> {
  try {
    return await createCountryDb({
      country_name: input.country_name.trim(),
      iso_code: input.iso_code.trim().toUpperCase(),
    });
  } catch (err) {
    handleCountryPgError(err);
  }
}

export async function updateCountryService(
  countryId: string,
  input: UpdateCountryDbInput
): Promise<CountryRow> {
  try {
    const updated = await updateCountryDb(countryId, {
      country_name: input.country_name?.trim(),
      iso_code: input.iso_code?.trim().toUpperCase(),
    });
    if (!updated) {
      throw new HttpError(404, "Country not found");
    }
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleCountryPgError(err);
  }
}

export async function deleteCountryService(countryId: string): Promise<void> {
  try {
    const deleted = await deleteCountryDb(countryId);
    if (!deleted) {
      throw new HttpError(404, "Country not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleCountryPgError(err);
  }
}
