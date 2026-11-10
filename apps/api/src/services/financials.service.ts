import {
  ExecutiveOverview,
  VendorFinancialPerformance,
  CashflowMonthPoint,
  getExecutiveOverviewDb,
  getVendorFinancialPerformanceDb,
  getMonthlyCashflowTrendDb,
} from "../db/financials.db.js";

export async function getExecutiveOverviewService(
  currency = "USD",
  fromDate?: string,
  toDate?: string
): Promise<ExecutiveOverview> {
  return getExecutiveOverviewDb(currency, fromDate, toDate);
}

export async function getVendorFinancialPerformanceService(
  currency = "USD"
): Promise<VendorFinancialPerformance[]> {
  return getVendorFinancialPerformanceDb(currency);
}

export async function getMonthlyCashflowTrendService(
  currency = "USD",
  monthsCount = 6
): Promise<CashflowMonthPoint[]> {
  return getMonthlyCashflowTrendDb(currency, monthsCount);
}
