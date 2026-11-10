import { Request, Response } from "express";
import {
  listCountriesService,
  getCountryByIdService,
  createCountryService,
  updateCountryService,
  deleteCountryService,
} from "../services/countries.service.js";

export const countriesController = {
  async list(_req: Request, res: Response) {
    const countries = await listCountriesService();
    res.json({ ok: true, data: countries });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const country = await getCountryByIdService(id);
    res.json({ ok: true, data: country });
  },

  async create(req: Request, res: Response) {
    const country = await createCountryService(req.body);
    res.status(201).json({ ok: true, data: country });
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const country = await updateCountryService(id, req.body);
    res.json({ ok: true, data: country });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteCountryService(id);
    res.json({ ok: true, data: { country_id: id } });
  },
};
