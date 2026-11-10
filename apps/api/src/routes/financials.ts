import { Router } from "express";
import { z } from "zod";
import { currencyCodeSchema } from "../schemas/common.js";
import { financialsController } from "../controllers/financials.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const financialsRouter = Router();

const overviewQuerySchema = z.object({
  currency: currencyCodeSchema.optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
});

const vendorQuerySchema = z.object({
  currency: currencyCodeSchema.optional(),
});

const trendQuerySchema = z.object({
  currency: currencyCodeSchema.optional(),
  months: z.coerce.number().int().min(1).max(12).optional(),
});

financialsRouter.use("/financials", requireAuth);

financialsRouter.get(
  "/financials/overview",
  validateQuery(overviewQuerySchema),
  asyncHandler(financialsController.getOverview)
);

financialsRouter.get(
  "/financials/vendors",
  validateQuery(vendorQuerySchema),
  asyncHandler(financialsController.getVendorPerformance)
);

financialsRouter.get(
  "/financials/trend",
  validateQuery(trendQuerySchema),
  asyncHandler(financialsController.getCashflowTrend)
);
