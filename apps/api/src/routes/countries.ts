import { Router } from "express";
import { z } from "zod";
import { bigintIdSchema } from "../schemas/common.js";
import {
  listCountriesService,
  getCountryByIdService,
  createCountryService,
  updateCountryService,
  deleteCountryService,
} from "../services/countries.service.js";

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

countriesRouter.get("/countries", async (req, res, next) => {
  try {
    const countries = await listCountriesService();
    res.json({ ok: true, data: countries });
  } catch (err) {
    next(err);
  }
});

countriesRouter.get("/countries/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const country = await getCountryByIdService(id);
    res.json({ ok: true, data: country });
  } catch (err) {
    next(err);
  }
});

countriesRouter.post("/countries", async (req, res, next) => {
  try {
    const body = createCountrySchema.parse(req.body);
    const country = await createCountryService(body);
    res.status(201).json({ ok: true, data: country });
  } catch (err) {
    next(err);
  }
});

countriesRouter.patch("/countries/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateCountrySchema.parse(req.body);
    const country = await updateCountryService(id, body);
    res.json({ ok: true, data: country });
  } catch (err) {
    next(err);
  }
});

countriesRouter.delete("/countries/:id", async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteCountryService(id);
    res.json({ ok: true, data: { country_id: id } });
  } catch (err) {
    next(err);
  }
});
