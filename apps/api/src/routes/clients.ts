import { Router } from "express";
import { z } from "zod";
import { bigintIdSchema } from "../schemas/common.js";
import { clientsController } from "../controllers/clients.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

clientsRouter.use("/clients", requireAuth);

clientsRouter.get(
  "/clients",
  validateQuery(listClientsQuerySchema),
  asyncHandler(clientsController.list)
);

clientsRouter.get(
  "/clients/:id",
  validateParams(idParamSchema),
  asyncHandler(clientsController.getById)
);

clientsRouter.post(
  "/clients",
  validateBody(createClientSchema),
  asyncHandler(clientsController.create)
);

clientsRouter.patch(
  "/clients/:id",
  validateParams(idParamSchema),
  validateBody(updateClientSchema),
  asyncHandler(clientsController.update)
);

clientsRouter.delete(
  "/clients/:id",
  validateParams(idParamSchema),
  asyncHandler(clientsController.remove)
);
