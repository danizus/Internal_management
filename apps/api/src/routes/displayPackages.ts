import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  nonNegativeMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import { displayPackagesController } from "../controllers/displayPackages.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
    message: "At least one package field must be provided",
  });

displayPackagesRouter.use("/display-packages", requireAuth);

displayPackagesRouter.get(
  "/display-packages",
  validateQuery(listDisplayPackagesQuerySchema),
  asyncHandler(displayPackagesController.list)
);

displayPackagesRouter.get(
  "/display-packages/:id",
  validateParams(idParamSchema),
  asyncHandler(displayPackagesController.getById)
);

displayPackagesRouter.post(
  "/display-packages",
  validateBody(createDisplayPackageSchema),
  asyncHandler(displayPackagesController.create)
);

displayPackagesRouter.patch(
  "/display-packages/:id",
  validateParams(idParamSchema),
  validateBody(updateDisplayPackageSchema),
  asyncHandler(displayPackagesController.update)
);

displayPackagesRouter.delete(
  "/display-packages/:id",
  validateParams(idParamSchema),
  asyncHandler(displayPackagesController.remove)
);
