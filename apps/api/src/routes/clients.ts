import { Router } from "express";
import { z } from "zod";
import { bigintIdSchema } from "../schemas/common.js";
import {
  listClientsService,
  getClientByIdService,
  createClientService,
  updateClientService,
  deleteClientService,
} from "../services/clients.service.js";

export const clientsRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const clientStatusSchema = z.enum(["active", "inactive", "closed"]);

const listClientsQuerySchema = z.object({
  status: clientStatusSchema.optional(),
  q: z.string().trim().optional(),
});

const createClientSchema = z.object({
  whmcs_client_id: bigintIdSchema.nullable().optional(),
  client_name: z.string().trim().min(1).max(150),
  client_email: z.string().trim().email().max(255),
  client_phone: z.string().trim().max(50).nullable().optional(),
  company_name: z.string().trim().max(150).nullable().optional(),
  status: clientStatusSchema.default("active"),
});

const updateClientSchema = createClientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one client field must be provided",
  });

clientsRouter.get("/clients", async (req, res, next) => {
  try {
    const filter = listClientsQuerySchema.parse(req.query);
    const clients = await listClientsService(filter);
    res.json({ ok: true, data: clients });
  } catch (err) {
    next(err);
  }
});

clientsRouter.get("/clients/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const client = await getClientByIdService(id);
    res.json({ ok: true, data: client });
  } catch (err) {
    next(err);
  }
});

clientsRouter.post("/clients", async (req, res, next) => {
  try {
    const body = createClientSchema.parse(req.body);
    const client = await createClientService(body);
    res.status(201).json({ ok: true, data: client });
  } catch (err) {
    next(err);
  }
});

clientsRouter.patch("/clients/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateClientSchema.parse(req.body);
    const client = await updateClientService(id, body);
    res.json({ ok: true, data: client });
  } catch (err) {
    next(err);
  }
});

clientsRouter.delete("/clients/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteClientService(id);
    res.json({ ok: true, data: { client_id: id } });
  } catch (err) {
    next(err);
  }
});
