import { Request, Response } from "express";
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

export const vendorsController = {
  // Vendors
  async listVendors(req: Request, res: Response) {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const vendors = await listVendorsService(q);
    res.json({ ok: true, data: vendors });
  },

  async getVendorById(req: Request, res: Response) {
    const id = String(req.params.id);
    const vendor = await getVendorByIdService(id);
    res.json({ ok: true, data: vendor });
  },

  async createVendor(req: Request, res: Response) {
    const vendor = await createVendorService(req.body);
    res.status(201).json({ ok: true, data: vendor });
  },

  async updateVendor(req: Request, res: Response) {
    const id = String(req.params.id);
    const vendor = await updateVendorService(id, req.body);
    res.json({ ok: true, data: vendor });
  },

  async removeVendor(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteVendorService(id);
    res.json({ ok: true, data: { vendor_id: id } });
  },

  // Wholesale Packages
  async listPackages(req: Request, res: Response) {
    const packages = await listVendorPackagesService(req.query);
    res.json({ ok: true, data: packages });
  },

  async getPackageById(req: Request, res: Response) {
    const id = String(req.params.id);
    const pkg = await getVendorPackageByIdService(id);
    res.json({ ok: true, data: pkg });
  },

  async createPackage(req: Request, res: Response) {
    const pkg = await createVendorPackageService(req.body);
    res.status(201).json({ ok: true, data: pkg });
  },

  async updatePackage(req: Request, res: Response) {
    const id = String(req.params.id);
    const pkg = await updateVendorPackageService(id, req.body);
    res.json({ ok: true, data: pkg });
  },

  async removePackage(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteVendorPackageService(id);
    res.json({ ok: true, data: { package_id: id } });
  },
};
