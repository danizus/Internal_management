import {
  DisplayPackageRow,
  ListDisplayPackagesFilter,
  CreateDisplayPackageDbInput,
  UpdateDisplayPackageDbInput,
  listDisplayPackagesDb,
  getDisplayPackageByIdDb,
  createDisplayPackageDb,
  updateDisplayPackageDb,
  deleteDisplayPackageDb,
} from "../db/displayPackages.db.js";
import { calculateProfitMinor } from "../schemas/common.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface DisplayPackageWithMargin extends DisplayPackageRow {
  estimated_margin_minor: string | null;
}

interface PgError extends Error {
  code?: string;
}

function enrichMargin(row: DisplayPackageRow): DisplayPackageWithMargin {
  let estimatedMarginMinor: string | null = null;
  if (
    row.upstream_price_minor !== null &&
    row.upstream_currency !== null &&
    row.upstream_currency.trim().toUpperCase() ===
      row.currency.trim().toUpperCase()
  ) {
    estimatedMarginMinor = calculateProfitMinor(
      row.price_minor,
      row.upstream_price_minor,
      "0"
    );
  }
  return {
    ...row,
    estimated_margin_minor: estimatedMarginMinor,
  };
}

function handleDisplayPackagePgError(err: unknown, context: string): never {
  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    throw new HttpError(
      409,
      "A retail display package with this WHMCS Product ID (whmcs_pid) already exists"
    );
  }
  if (pgErr?.code === "23503") {
    if (context === "delete") {
      throw new HttpError(
        409,
        "Cannot delete retail package because purchases or refunds reference it"
      );
    }
    throw new HttpError(
      400,
      "Referenced country_id, vendor_id, or default_vendor_package_id does not exist"
    );
  }
  throw err;
}

export async function listDisplayPackagesService(
  filter: ListDisplayPackagesFilter
): Promise<DisplayPackageWithMargin[]> {
  const rows = await listDisplayPackagesDb(filter);
  return rows.map(enrichMargin);
}

export async function getDisplayPackageByIdService(
  displayPackageId: string
): Promise<DisplayPackageWithMargin> {
  const row = await getDisplayPackageByIdDb(displayPackageId);
  if (!row) {
    throw new HttpError(404, "Retail display package not found");
  }
  return enrichMargin(row);
}

export async function createDisplayPackageService(
  input: CreateDisplayPackageDbInput
): Promise<DisplayPackageWithMargin> {
  try {
    const created = await createDisplayPackageDb(input);
    return enrichMargin(created);
  } catch (err) {
    handleDisplayPackagePgError(err, "write");
  }
}

export async function updateDisplayPackageService(
  displayPackageId: string,
  input: UpdateDisplayPackageDbInput
): Promise<DisplayPackageWithMargin> {
  try {
    const updated = await updateDisplayPackageDb(displayPackageId, input);
    if (!updated) {
      throw new HttpError(404, "Retail display package not found");
    }
    return enrichMargin(updated);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleDisplayPackagePgError(err, "write");
  }
}

export async function deleteDisplayPackageService(
  displayPackageId: string
): Promise<void> {
  try {
    const deleted = await deleteDisplayPackageDb(displayPackageId);
    if (!deleted) {
      throw new HttpError(404, "Retail display package not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleDisplayPackagePgError(err, "delete");
  }
}
