import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import { vendorsController } from "../controllers/vendors.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

const listVendorsQuerySchema = z.object({
  q: z.string().trim().optional(),
});

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
  notes: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
});

const updateVendorPackageSchema = createVendorPackageSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one package field must be provided",
  });

vendorsRouter.use("/vendors", requireAuth);
vendorsRouter.use("/vendor-packages", requireAuth);

// --- Vendors ---
vendorsRouter.get(
  "/vendors",
  validateQuery(listVendorsQuerySchema),
  asyncHandler(vendorsController.listVendors)
);

vendorsRouter.get(
  "/vendors/:id",
  validateParams(idParamSchema),
  asyncHandler(vendorsController.getVendorById)
);

vendorsRouter.post(
  "/vendors",
  validateBody(createVendorSchema),
  asyncHandler(vendorsController.createVendor)
);

vendorsRouter.patch(
  "/vendors/:id",
  validateParams(idParamSchema),
  validateBody(updateVendorSchema),
  asyncHandler(vendorsController.updateVendor)
);

vendorsRouter.delete(
  "/vendors/:id",
  validateParams(idParamSchema),
  asyncHandler(vendorsController.removeVendor)
);

// --- Wholesale Packages ---
vendorsRouter.get(
  "/vendor-packages",
  validateQuery(listVendorPackagesQuerySchema),
  asyncHandler(vendorsController.listPackages)
);

vendorsRouter.get(
  "/vendor-packages/:id",
  validateParams(idParamSchema),
  asyncHandler(vendorsController.getPackageById)
);

vendorsRouter.post(
  "/vendor-packages",
  validateBody(createVendorPackageSchema),
  asyncHandler(vendorsController.createPackage)
);

vendorsRouter.patch(
  "/vendor-packages/:id",
  validateParams(idParamSchema),
  validateBody(updateVendorPackageSchema),
  asyncHandler(vendorsController.updatePackage)
);

vendorsRouter.delete(
  "/vendor-packages/:id",
  validateParams(idParamSchema),
  asyncHandler(vendorsController.removePackage)
);
