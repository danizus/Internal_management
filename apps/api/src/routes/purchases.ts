import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import {
  listPurchasesService,
  getPurchaseByIdService,
  createPurchaseService,
  updatePurchaseService,
  fulfillPurchaseService,
  deletePurchaseService,
} from "../services/purchases.service.js";

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

purchasesRouter.get("/purchases", async (req, res, next) => {
  try {
    const filter = listPurchasesQuerySchema.parse(req.query);
    const purchases = await listPurchasesService(filter);
    res.json({ ok: true, data: purchases });
  } catch (err) {
    next(err);
  }
});

purchasesRouter.get("/purchases/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const purchase = await getPurchaseByIdService(id);
    res.json({ ok: true, data: purchase });
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post("/purchases", async (req, res, next) => {
  try {
    const body = createPurchaseSchema.parse(req.body);
    const purchase = await createPurchaseService(body);
    res.status(201).json({ ok: true, data: purchase });
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post("/purchases/:id/fulfill", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = fulfillPurchaseSchema.parse(req.body);
    const purchase = await fulfillPurchaseService(id, body);
    res.json({ ok: true, data: purchase });
  } catch (err) {
    next(err);
  }
});

purchasesRouter.patch("/purchases/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updatePurchaseSchema.parse(req.body);
    const purchase = await updatePurchaseService(id, body);
    res.json({ ok: true, data: purchase });
  } catch (err) {
    next(err);
  }
});

purchasesRouter.delete("/purchases/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deletePurchaseService(id);
    res.json({ ok: true, data: { purchase_id: id } });
  } catch (err) {
    next(err);
  }
});
