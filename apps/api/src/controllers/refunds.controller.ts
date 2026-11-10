import { Request, Response } from "express";
import {
  listRefundsService,
  getRefundByIdService,
  createRefundService,
  deleteRefundService,
} from "../services/refunds.service.js";

export const refundsController = {
  async list(req: Request, res: Response) {
    const refunds = await listRefundsService(req.query);
    res.json({ ok: true, data: refunds });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const refund = await getRefundByIdService(id);
    res.json({ ok: true, data: refund });
  },

  async create(req: Request, res: Response) {
    const refund = await createRefundService(req.body);
    res.status(201).json({ ok: true, data: refund });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await deleteRefundService(id);
    res.json({ ok: true, data: result });
  },
};
