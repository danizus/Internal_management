import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import {
  listDisplayPackagesService,
  getDisplayPackageByIdService,
  createDisplayPackageService,
  updateDisplayPackageService,
  deleteDisplayPackageService,
} from "../services/displayPackages.service.js";

export const displayPackagesRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const billingCycleSchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
]);

const listDisplayPackagesQuerySchema = z.object({
  country_id: bigintIdSchema.optional(),
  vendor_id: bigintIdSchema.optional(),
  whmcs_pid: bigintIdSchema.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  q: z.string().trim().optional(),
});

const createDisplayPackageSchema = z.object({
  whmcs_pid: bigintIdSchema.nullable().optional(),
  vendor_id: bigintIdSchema.nullable().optional(),
  default_vendor_package_id: bigintIdSchema.nullable().optional(),
  country_id: bigintIdSchema,
  package_name: z.string().trim().min(1).max(150),
  cpu_cores: z.string().trim().max(50).nullable().optional(),
  ram: z.string().trim().min(1).max(50),
  storage: z.string().trim().min(1).max(50),
  operating_system: z.string().trim().min(1).max(100),
  bandwidth: z.string().trim().min(1).max(50),
  dedicated_ip: z.string().trim().min(1).max(50),
  price_minor: nonNegativeMinorAmountSchema,
  currency: currencyCodeSchema,
  billing_cycle: billingCycleSchema.default("monthly"),
  is_active: z.boolean().default(true),
});

const updateDisplayPackageSchema = createDisplayPackageSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one display package field must be provided",
  });

displayPackagesRouter.get("/display-packages", async (req, res, next) => {
  try {
    const filter = listDisplayPackagesQuerySchema.parse(req.query);
    const packages = await listDisplayPackagesService(filter);
    res.json({ ok: true, data: packages });
  } catch (err) {
    next(err);
  }
});

displayPackagesRouter.get("/display-packages/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const pkg = await getDisplayPackageByIdService(id);
    res.json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

displayPackagesRouter.post("/display-packages", async (req, res, next) => {
  try {
    const body = createDisplayPackageSchema.parse(req.body);
    const pkg = await createDisplayPackageService(body);
    res.status(201).json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

displayPackagesRouter.patch("/display-packages/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateDisplayPackageSchema.parse(req.body);
    const pkg = await updateDisplayPackageService(id, body);
    res.json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

displayPackagesRouter.delete(
  "/display-packages/:id",
  async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await deleteDisplayPackageService(id);
      res.json({ ok: true, data: { display_package_id: id } });
    } catch (err) {
      next(err);
    }
  }
);
