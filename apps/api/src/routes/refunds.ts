import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  positiveMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import { refundsController } from "../controllers/refunds.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const refundsRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const listRefundsQuerySchema = z.object({
  purchase_id: bigintIdSchema.optional(),
  client_id: bigintIdSchema.optional(),
  vendor_id: bigintIdSchema.optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createRefundSchema = z.object({
  purchase_id: bigintIdSchema,
  client_id: bigintIdSchema.optional(),
  vendor_id: bigintIdSchema.nullable().optional(),
  display_package_id: bigintIdSchema.nullable().optional(),
  refund_amount_minor: positiveMinorAmountSchema,
  currency: currencyCodeSchema.optional(),
  whmcs_transaction_id: z.string().trim().max(100).nullable().optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
  refund_date: z.string().datetime().optional(),
});

refundsRouter.use("/refunds", requireAuth);

refundsRouter.get(
  "/refunds",
  validateQuery(listRefundsQuerySchema),
  asyncHandler(refundsController.list)
);

refundsRouter.get(
  "/refunds/:id",
  validateParams(idParamSchema),
  asyncHandler(refundsController.getById)
);

refundsRouter.post(
  "/refunds",
  validateBody(createRefundSchema),
  asyncHandler(refundsController.create)
);

refundsRouter.delete(
  "/refunds/:id",
  validateParams(idParamSchema),
  asyncHandler(refundsController.remove)
);
