import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import { purchasesController } from "../controllers/purchases.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const purchasesRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const purchaseStatusSchema = z.enum([
  "pending_fulfillment",
  "active",
  "suspended",
  "cancelled",
  "refunded",
]);

const billingCycleSchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
  "one_time",
]);

const listPurchasesQuerySchema = z.object({
  status: purchaseStatusSchema.optional(),
  client_id: bigintIdSchema.optional(),
  vendor_id: bigintIdSchema.optional(),
  due_within_days: z.coerce.number().int().min(1).max(365).optional(),
  q: z.string().trim().optional(),
});

const createPurchaseSchema = z.object({
  whmcs_order_id: bigintIdSchema.nullable().optional(),
  whmcs_service_id: bigintIdSchema.nullable().optional(),
  whmcs_invoice_id: bigintIdSchema.nullable().optional(),
  client_id: bigintIdSchema,
  display_package_id: bigintIdSchema.nullable().optional(),
  vendor_id: bigintIdSchema.nullable().optional(),
  package_id: bigintIdSchema.nullable().optional(),
  ip_address: z.string().trim().max(100).nullable().optional(),
  hostname: z.string().trim().max(255).nullable().optional(),
  status: purchaseStatusSchema.default("pending_fulfillment"),
  sales_amount_minor: nonNegativeMinorAmountSchema,
  purchase_amount_minor: nonNegativeMinorAmountSchema.optional().default("0"),
  processing_charges_minor: nonNegativeMinorAmountSchema
    .optional()
    .default("0"),
  currency: currencyCodeSchema,
  purchase_date: z.string().datetime().optional(),
  due_date: z.string().datetime().nullable().optional(),
  billing_cycle: billingCycleSchema.default("monthly"),
  payment_method: z.string().trim().max(60).nullable().optional(),
});

const updatePurchaseSchema = z
  .object({
    whmcs_order_id: bigintIdSchema.nullable().optional(),
    whmcs_service_id: bigintIdSchema.nullable().optional(),
    whmcs_invoice_id: bigintIdSchema.nullable().optional(),
    client_id: bigintIdSchema.optional(),
    display_package_id: bigintIdSchema.nullable().optional(),
    vendor_id: bigintIdSchema.nullable().optional(),
    package_id: bigintIdSchema.nullable().optional(),
    ip_address: z.string().trim().max(100).nullable().optional(),
    hostname: z.string().trim().max(255).nullable().optional(),
    status: purchaseStatusSchema.optional(),
    sales_amount_minor: nonNegativeMinorAmountSchema.optional(),
    purchase_amount_minor: nonNegativeMinorAmountSchema.optional(),
    processing_charges_minor: nonNegativeMinorAmountSchema.optional(),
    currency: currencyCodeSchema.optional(),
    purchase_date: z.string().datetime().optional(),
    due_date: z.string().datetime().nullable().optional(),
    billing_cycle: billingCycleSchema.optional(),
    payment_method: z.string().trim().max(60).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one purchase field must be provided",
  });

const fulfillPurchaseSchema = z.object({
  vendor_id: bigintIdSchema,
  package_id: bigintIdSchema,
  ip_address: z.string().trim().min(1).max(100),
  hostname: z.string().trim().max(255).nullable().optional(),
  purchase_amount_minor: nonNegativeMinorAmountSchema,
  processing_charges_minor: nonNegativeMinorAmountSchema.optional(),
});

purchasesRouter.use("/purchases", requireAuth);

purchasesRouter.get(
  "/purchases",
  validateQuery(listPurchasesQuerySchema),
  asyncHandler(purchasesController.list)
);

purchasesRouter.get(
  "/purchases/:id",
  validateParams(idParamSchema),
  asyncHandler(purchasesController.getById)
);

purchasesRouter.post(
  "/purchases",
  validateBody(createPurchaseSchema),
  asyncHandler(purchasesController.create)
);

purchasesRouter.post(
  "/purchases/:id/fulfill",
  validateParams(idParamSchema),
  validateBody(fulfillPurchaseSchema),
  asyncHandler(purchasesController.fulfill)
);

purchasesRouter.patch(
  "/purchases/:id",
  validateParams(idParamSchema),
  validateBody(updatePurchaseSchema),
  asyncHandler(purchasesController.update)
);

purchasesRouter.delete(
  "/purchases/:id",
  validateParams(idParamSchema),
  asyncHandler(purchasesController.remove)
);
