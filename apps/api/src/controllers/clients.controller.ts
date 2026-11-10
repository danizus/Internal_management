import { Request, Response } from "express";
import {
  listClientsService,
  getClientByIdService,
  createClientService,
  updateClientService,
  deleteClientService,
} from "../services/clients.service.js";

export const clientsController = {
  async list(req: Request, res: Response) {
    const clients = await listClientsService(req.query);
    res.json({ ok: true, data: clients });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const client = await getClientByIdService(id);
    res.json({ ok: true, data: client });
  },

  async create(req: Request, res: Response) {
    const client = await createClientService(req.body);
    res.status(201).json({ ok: true, data: client });
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const client = await updateClientService(id, req.body);
    res.json({ ok: true, data: client });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteClientService(id);
    res.json({ ok: true, data: { client_id: id } });
  },
};
