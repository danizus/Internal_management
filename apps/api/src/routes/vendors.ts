import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import {
  listVendorsService,
  getVendorByIdService,
  createVendorService,
  updateVendorService,
  deleteVendorService,
  listVendorPackagesService,
  getVendorPackageByIdService,
  createVendorPackageService,
  updateVendorPackageService,
  deleteVendorPackageService,
} from "../services/vendors.service.js";

export const vendorsRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const billingCycleSchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
]);

const createVendorSchema = z.object({
  vendor_name: z.string().trim().min(1).max(150),
  vendor_website: z.string().trim().max(500).nullable().optional(),
  vendor_rating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const updateVendorSchema = createVendorSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one vendor field must be provided",
  });

const listVendorPackagesQuerySchema = z.object({
  vendor_id: bigintIdSchema.optional(),
  country_id: bigintIdSchema.optional(),
  operating_system: z.string().trim().optional(),
  max_price_minor: nonNegativeMinorAmountSchema.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  q: z.string().trim().optional(),
});

const createVendorPackageSchema = z.object({
  vendor_id: bigintIdSchema,
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

const updateVendorPackageSchema = createVendorPackageSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one vendor package field must be provided",
  });

// --- Vendors Routes ---

vendorsRouter.get("/vendors", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const vendors = await listVendorsService(q);
    res.json({ ok: true, data: vendors });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.get("/vendors/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const vendor = await getVendorByIdService(id);
    res.json({ ok: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.post("/vendors", async (req, res, next) => {
  try {
    const body = createVendorSchema.parse(req.body);
    const vendor = await createVendorService(body);
    res.status(201).json({ ok: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.patch("/vendors/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateVendorSchema.parse(req.body);
    const vendor = await updateVendorService(id, body);
    res.json({ ok: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.delete("/vendors/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteVendorService(id);
    res.json({ ok: true, data: { vendor_id: id } });
  } catch (err) {
    next(err);
  }
});

// --- Wholesale Vendor Packages Routes ---

vendorsRouter.get("/vendor-packages", async (req, res, next) => {
  try {
    const filter = listVendorPackagesQuerySchema.parse(req.query);
    const packages = await listVendorPackagesService(filter);
    res.json({ ok: true, data: packages });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.get("/vendor-packages/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const pkg = await getVendorPackageByIdService(id);
    res.json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.post("/vendor-packages", async (req, res, next) => {
  try {
    const body = createVendorPackageSchema.parse(req.body);
    const pkg = await createVendorPackageService(body);
    res.status(201).json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.patch("/vendor-packages/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateVendorPackageSchema.parse(req.body);
    const pkg = await updateVendorPackageService(id, body);
    res.json({ ok: true, data: pkg });
  } catch (err) {
    next(err);
  }
});

vendorsRouter.delete("/vendor-packages/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteVendorPackageService(id);
    res.json({ ok: true, data: { package_id: id } });
  } catch (err) {
    next(err);
  }
});
