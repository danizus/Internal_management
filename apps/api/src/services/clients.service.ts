import {
  ClientRow,
  ListClientsFilter,
  CreateClientDbInput,
  UpdateClientDbInput,
  listClientsDb,
  getClientByIdDb,
  createClientDb,
  updateClientDb,
  deleteClientDb,
} from "../db/clients.db.js";
import { HttpError } from "../middleware/errorHandler.js";

interface PgError extends Error {
  code?: string;
}

function handleClientPgError(err: unknown, context: string): never {
  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    throw new HttpError(
      409,
      "A client with this WHMCS Client ID already exists"
    );
  }
  if (pgErr?.code === "23503") {
    if (context === "delete") {
      throw new HttpError(
        409,
        "Cannot delete client because purchases or refunds reference it"
      );
    }
  }
  throw err;
}

export async function listClientsService(
  filter: ListClientsFilter
): Promise<ClientRow[]> {
  return listClientsDb(filter);
}

export async function getClientByIdService(
  clientId: string
): Promise<ClientRow> {
  const client = await getClientByIdDb(clientId);
  if (!client) {
    throw new HttpError(404, "Client not found");
  }
  return client;
}

export async function createClientService(
  input: CreateClientDbInput
): Promise<ClientRow> {
  try {
    return await createClientDb({
      whmcs_client_id: input.whmcs_client_id ?? null,
      client_name: input.client_name.trim(),
      client_email: input.client_email.trim().toLowerCase(),
      client_phone: input.client_phone?.trim() || null,
      company_name: input.company_name?.trim() || null,
      status: input.status ?? "active",
    });
  } catch (err) {
    handleClientPgError(err, "write");
  }
}

export async function updateClientService(
  clientId: string,
  input: UpdateClientDbInput
): Promise<ClientRow> {
  try {
    const updated = await updateClientDb(clientId, {
      whmcs_client_id:
        input.whmcs_client_id === undefined
          ? undefined
          : input.whmcs_client_id || null,
      client_name: input.client_name?.trim(),
      client_email: input.client_email?.trim().toLowerCase(),
      client_phone:
        input.client_phone === undefined
          ? undefined
          : input.client_phone?.trim() || null,
      company_name:
        input.company_name === undefined
          ? undefined
          : input.company_name?.trim() || null,
      status: input.status,
    });
    if (!updated) {
      throw new HttpError(404, "Client not found");
    }
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleClientPgError(err, "write");
  }
}

export async function deleteClientService(clientId: string): Promise<void> {
  try {
    const deleted = await deleteClientDb(clientId);
    if (!deleted) {
      throw new HttpError(404, "Client not found");
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    handleClientPgError(err, "delete");
  }
}
