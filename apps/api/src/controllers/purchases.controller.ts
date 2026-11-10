import { Request, Response } from "express";
import {
  listPurchasesService,
  getPurchaseByIdService,
  createPurchaseService,
  updatePurchaseService,
  fulfillPurchaseService,
  deletePurchaseService,
} from "../services/purchases.service.js";

export const purchasesController = {
  async list(req: Request, res: Response) {
    const purchases = await listPurchasesService(req.query);
    res.json({ ok: true, data: purchases });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const purchase = await getPurchaseByIdService(id);
    res.json({ ok: true, data: purchase });
  },

  async create(req: Request, res: Response) {
    const purchase = await createPurchaseService(req.body);
    res.status(201).json({ ok: true, data: purchase });
  },

  async fulfill(req: Request, res: Response) {
    const id = String(req.params.id);
    const purchase = await fulfillPurchaseService(id, req.body);
    res.json({ ok: true, data: purchase });
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const purchase = await updatePurchaseService(id, req.body);
    res.json({ ok: true, data: purchase });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    await deletePurchaseService(id);
    res.json({ ok: true, data: { purchase_id: id } });
  },
};
