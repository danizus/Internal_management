import { Router } from "express";
import { z } from "zod";
import { whmcsController } from "../controllers/whmcs.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const whmcsRouter = Router();

const webhookPayloadSchema = z.object({
  event: z.enum([
    "order_paid",
    "order_accepted",
    "invoice_paid",
    "service_status_change",
  ]),
  order_id: z.union([z.string(), z.number()]).nullable().optional(),
  service_id: z.union([z.string(), z.number()]),
  invoice_id: z.union([z.string(), z.number()]).nullable().optional(),
  product_id: z.union([z.string(), z.number()]).nullable().optional(),
  client: z.object({
    client_id: z.union([z.string(), z.number()]),
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
  }),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  billing_cycle: z.string().optional(),
  payment_method: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: z.string().optional(),
});

/**
 * Public Webhook endpoint for WHMCS Action Hook
 * Signature must be passed in X-WHMCS-Signature header
 */
whmcsRouter.post(
  "/webhooks/whmcs",
  asyncHandler(whmcsController.webhook)
);

/**
 * Check WHMCS integration configuration status
 */
whmcsRouter.get(
  "/whmcs/status",
  requireAuth,
  asyncHandler(whmcsController.status)
);

/**
 * Trigger manual sync / pull from WHMCS
 */
whmcsRouter.post(
  "/whmcs/sync",
  requireAuth,
  asyncHandler(whmcsController.sync)
);

/**
 * View recent sync / webhook audit logs
 */
whmcsRouter.get(
  "/whmcs/logs",
  requireAuth,
  asyncHandler(whmcsController.logs)
);
