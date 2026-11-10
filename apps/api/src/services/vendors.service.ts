import {
  VendorRow,
  CreateVendorDbInput,
  UpdateVendorDbInput,
  VendorPackageRow,
  ListVendorPackagesFilter,
  CreateVendorPackageDbInput,
  UpdateVendorPackageDbInput,
  listVendorsDb,
  getVendorByIdDb,
  createVendorDb,
  updateVendorDb,
  deleteVendorDb,
  listVendorPackagesDb,
  getVendorPackageByIdDb,
  createVendorPackageDb,
  updateVendorPackageDb,
  deleteVendorPackageDb,
} from "../db/vendors.db.js";
import { HttpError } from "../middleware/errorHandler.js";

interface PgError extends Error {
  code?: string;
}

function handleVendorPgError(err: unknown, context: string): never {
  const pgErr = err as PgError;
  if (pgErr?.code === "23503") {
    if (context === "delete") {
      throw new HttpError(
        409,
        "Cannot delete record because other packages or purchases reference it"
      );
    }
    throw new HttpError(400, "Referenced vendor_id or country_id does not exist");
  }
  throw err;
}

export async function listVendorsService(search?: string): Promise<VendorRow[]> {
  return listVendorsDb(search);
}

export async function getVendorByIdService(
  vendorId: string
): Promise<VendorRow> {
  const vendor = await getVendorByIdDb(vendorId);
  if (!vendor) {
    throw new HttpError(404, "Vendor not found");
  }
  return vendor;
}

export async function createVendorService(
  input: CreateVendorDbInput
): Promise<VendorRow> {
  return createVendorDb({
    vendor_name: input.vendor_name.trim(),
    vendor_website: input.vendor_website?.trim() || null,
    vendor_rating: input.vendor_rating ?? 0,
    notes: input.notes?.trim() || null,
  });
}

export async function updateVendorService(
  vendorId: string,
  input: UpdateVendorDbInput
): Promise<VendorRow> {
  const updated = await updateVendorDb(vendorId, {
    vendor_name: input.vendor_name?.trim(),
    vendor_website:
      input.vendor_website === undefined
        ? undefined
        : input.vendor_website?.trim() || null,
    vendor_rating: input.vendor_rating,
    notes:
      input.notes === undefined ? undefined : input.notes?.trim() || null,
  });
  if (!updated) {
    throw new HttpError(404, "Vendor not found");
  }
  return updated;
}

export async function deleteVendorService(vendorId: string): Promise<void> {
  try {
    const deleted = await deleteVendorDb(vendorId);
    if (!deleted) {
      throw new HttpError(404, "Vendor not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleVendorPgError(err, "delete");
  }
}

export async function listVendorPackagesService(
  filter: ListVendorPackagesFilter
): Promise<VendorPackageRow[]> {
  return listVendorPackagesDb(filter);
}

export async function getVendorPackageByIdService(
  packageId: string
): Promise<VendorPackageRow> {
  const pkg = await getVendorPackageByIdDb(packageId);
  if (!pkg) {
    throw new HttpError(404, "Vendor package not found");
  }
  return pkg;
}

export async function createVendorPackageService(
  input: CreateVendorPackageDbInput
): Promise<VendorPackageRow> {
  try {
    return await createVendorPackageDb(input);
  } catch (err) {
    handleVendorPgError(err, "write");
  }
}

export async function updateVendorPackageService(
  packageId: string,
  input: UpdateVendorPackageDbInput
): Promise<VendorPackageRow> {
  try {
    const updated = await updateVendorPackageDb(packageId, input);
    if (!updated) {
      throw new HttpError(404, "Vendor package not found");
    }
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleVendorPgError(err, "write");
  }
}

export async function deleteVendorPackageService(
  packageId: string
): Promise<void> {
  try {
    const deleted = await deleteVendorPackageDb(packageId);
    if (!deleted) {
      throw new HttpError(404, "Vendor package not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleVendorPgError(err, "delete");
  }
}
