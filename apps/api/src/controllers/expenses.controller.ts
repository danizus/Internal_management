import { Request, Response } from "express";
import {
  listExpensesService,
  getExpenseByIdService,
  createExpenseService,
  updateExpenseService,
  deleteExpenseService,
} from "../services/expenses.service.js";

export const expensesController = {
  async list(req: Request, res: Response) {
    const expenses = await listExpensesService(req.query);
    res.json({ ok: true, data: expenses });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const expense = await getExpenseByIdService(id);
    res.json({ ok: true, data: expense });
  },

  async create(req: Request, res: Response) {
    const expense = await createExpenseService(req.body);
    res.status(201).json({ ok: true, data: expense });
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const expense = await updateExpenseService(id, req.body);
    res.json({ ok: true, data: expense });
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    await deleteExpenseService(id);
    res.json({ ok: true, data: { expense_id: id } });
  },
};
