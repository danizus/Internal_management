import { Request, Response } from "express";
import {
  getExecutiveOverviewService,
  getVendorFinancialPerformanceService,
  getMonthlyCashflowTrendService,
} from "../services/financials.service.js";

export const financialsController = {
  async getOverview(req: Request, res: Response) {
    const currency = typeof req.query.currency === "string" ? req.query.currency : "USD";
    const fromDate = typeof req.query.from_date === "string" ? req.query.from_date : undefined;
    const toDate = typeof req.query.to_date === "string" ? req.query.to_date : undefined;

    const overview = await getExecutiveOverviewService(currency, fromDate, toDate);
    res.json({ ok: true, data: overview });
  },

  async getVendorPerformance(req: Request, res: Response) {
    const currency = typeof req.query.currency === "string" ? req.query.currency : "USD";
    const vendors = await getVendorFinancialPerformanceService(currency);
    res.json({ ok: true, data: vendors });
  },

  async getCashflowTrend(req: Request, res: Response) {
    const currency = typeof req.query.currency === "string" ? req.query.currency : "USD";
    const months = req.query.months ? parseInt(String(req.query.months), 10) : 6;
    const trend = await getMonthlyCashflowTrendService(currency, months);
    res.json({ ok: true, data: trend });
  },
};
