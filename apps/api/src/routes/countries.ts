import { Router } from "express";
import { z } from "zod";
import { bigintIdSchema } from "../schemas/common.js";
import { countriesController } from "../controllers/countries.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const countriesRouter = Router();

const createCountrySchema = z.object({
  country_name: z.string().trim().min(2).max(100),
  iso_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,3}$/, "ISO code must be 2 or 3 uppercase letters (e.g. US, DE)"),
});

const updateCountrySchema = createCountrySchema
  .partial()
  .refine(
    (data) => data.country_name !== undefined || data.iso_code !== undefined,
    { message: "At least one field (country_name or iso_code) must be provided" }
  );

const idParamSchema = z.object({
  id: bigintIdSchema,
});

countriesRouter.use("/countries", requireAuth);

countriesRouter.get(
  "/countries",
  asyncHandler(countriesController.list)
);

countriesRouter.get(
  "/countries/:id",
  validateParams(idParamSchema),
  asyncHandler(countriesController.getById)
);

countriesRouter.post(
  "/countries",
  validateBody(createCountrySchema),
  asyncHandler(countriesController.create)
);

countriesRouter.patch(
  "/countries/:id",
  validateParams(idParamSchema),
  validateBody(updateCountrySchema),
  asyncHandler(countriesController.update)
);

countriesRouter.delete(
  "/countries/:id",
  validateParams(idParamSchema),
  asyncHandler(countriesController.remove)
);
