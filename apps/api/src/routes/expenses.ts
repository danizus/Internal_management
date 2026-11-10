import { Router } from "express";
import { z } from "zod";
import {
  bigintIdSchema,
  positiveMinorAmountSchema,
  currencyCodeSchema,
} from "../schemas/common.js";
import { expensesController } from "../controllers/expenses.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const expensesRouter = Router();

const idParamSchema = z.object({
  id: bigintIdSchema,
});

const expenseCategorySchema = z.enum([
  "infrastructure",
  "software_licenses",
  "payment_gateway",
  "marketing",
  "payroll",
  "general",
]);

const listExpensesQuerySchema = z.object({
  category: expenseCategorySchema.optional(),
  vendor_id: bigintIdSchema.optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createExpenseSchema = z.object({
  vendor_id: bigintIdSchema.nullable().optional(),
  expense_title: z.string().trim().min(1).max(150),
  expense_description: z.string().trim().max(2000).nullable().optional(),
  category: expenseCategorySchema.default("general"),
  expense_amount_minor: positiveMinorAmountSchema,
  currency: currencyCodeSchema,
  expense_date: z.string().datetime().optional(),
});

const updateExpenseSchema = z
  .object({
    vendor_id: bigintIdSchema.nullable().optional(),
    expense_title: z.string().trim().min(1).max(150).optional(),
    expense_description: z.string().trim().max(2000).nullable().optional(),
    category: expenseCategorySchema.optional(),
    expense_amount_minor: positiveMinorAmountSchema.optional(),
    currency: currencyCodeSchema.optional(),
    expense_date: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one expense field must be provided",
  });

expensesRouter.use("/expenses", requireAuth);

expensesRouter.get(
  "/expenses",
  validateQuery(listExpensesQuerySchema),
  asyncHandler(expensesController.list)
);

expensesRouter.get(
  "/expenses/:id",
  validateParams(idParamSchema),
  asyncHandler(expensesController.getById)
);

expensesRouter.post(
  "/expenses",
  validateBody(createExpenseSchema),
  asyncHandler(expensesController.create)
);

expensesRouter.patch(
  "/expenses/:id",
  validateParams(idParamSchema),
  validateBody(updateExpenseSchema),
  asyncHandler(expensesController.update)
);

expensesRouter.delete(
  "/expenses/:id",
  validateParams(idParamSchema),
  asyncHandler(expensesController.remove)
);
