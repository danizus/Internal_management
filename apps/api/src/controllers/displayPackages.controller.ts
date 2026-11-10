import { Request, Response } from "express";
import {
  listDisplayPackagesService,
  getDisplayPackageByIdService,
  createDisplayPackageService,
  updateDisplayPackageService,
  deleteDisplayPackageService,
} from "../services/displayPackages.service.js";

export const displayPackagesController = {
  async list(req: Request, res: Response) {
    const packages = await listDisplayPackagesService(req.query);
    res.json({ ok: true, data: packages });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const pkg = await getDisplayPackageByIdService(id);
    res.json({ ok: true, data: pkg });
  },

  async create(req: Request, res: Response) {
    const pkg = await createDisplayPackageService(req.body);
    res.status(201).json({ ok: true, data: pkg });
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const pkg = await updateDisplayPackageService(id, req.body);
    res.json({ ok: true, data: pkg });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteDisplayPackageService(id);
    res.json({ ok: true, data: { display_package_id: id } });
  },
};
