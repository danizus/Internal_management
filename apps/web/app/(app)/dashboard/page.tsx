"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Server,
  AlertCircle,
  RefreshCw,
  Building2,
  CreditCard,
  Percent,
  Receipt,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMinorToMoney } from "@/lib/money";

interface ExecutiveOverview {
  currency: string;
  gross_sales_minor: string;
  wholesale_cogs_minor: string;
  gateway_charges_minor: string;
  refunds_minor: string;
  expenses_minor: string;
  net_profit_minor: string;
  profit_margin_pct: number;
  active_vps_count: number;
  pending_fulfillment_count: number;
  total_clients_count: number;
}

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  active_orders_count: number;
  gross_sales_minor: string;
  wholesale_cost_minor: string;
  vendor_expenses_minor: string;
  net_vendor_profit_minor: string;
  currency: string;
}

interface CashflowMonth {
  year_month: string;
  sales_minor: string;
  costs_minor: string;
  refunds_minor: string;
  expenses_minor: string;
  net_profit_minor: string;
  currency: string;
}

const CURRENCIES = ["USD", "EUR", "GBP"];

export default function DashboardPage() {
  const [currency, setCurrency] = React.useState("USD");
  const [timeFilter, setTimeFilter] = React.useState<"all" | "this_month" | "30d">("all");

  const [overview, setOverview] = React.useState<ExecutiveOverview | null>(null);
  const [vendors, setVendors] = React.useState<VendorPerformance[]>([]);
  const [trend, setTrend] = React.useState<CashflowMonth[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overviewParams = new URLSearchParams({ currency });
      const now = new Date();

      if (timeFilter === "this_month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        overviewParams.set("from_date", startOfMonth);
      } else if (timeFilter === "30d") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        overviewParams.set("from_date", thirtyDaysAgo);
      }

      const [resOverview, resVendors, resTrend] = await Promise.all([
        fetch(`/api/financials/overview?${overviewParams.toString()}`),
        fetch(`/api/financials/vendors?currency=${currency}`),
        fetch(`/api/financials/trend?currency=${currency}&months=6`),
      ]);

      const [jsonOverview, jsonVendors, jsonTrend] = await Promise.all([
        resOverview.json(),
        resVendors.json(),
        resTrend.json(),
      ]);

      if (jsonOverview.ok) {
        setOverview(jsonOverview.data);
      } else {
        setError(jsonOverview.error?.message || "Failed to load executive overview");
      }

      if (jsonVendors.ok) {
        setVendors(jsonVendors.data || []);
      }

      if (jsonTrend.ok) {
        setTrend(jsonTrend.data || []);
      }
    } catch {
      setError("Network error while connecting to executive analytics API");
    } finally {
      setLoading(false);
    }
  }, [currency, timeFilter]);

  React.useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const isNetPositive = overview ? BigInt(overview.net_profit_minor || "0") >= 0n : true;

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time financial performance, margins, fleet status, and vendor ranking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  currency === c
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
            <button
              type="button"
              onClick={() => setTimeFilter("all")}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeFilter === "all"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("this_month")}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeFilter === "this_month"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("30d")}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeFilter === "30d"
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchDashboardData()}
            disabled={loading}
            className="cursor-pointer border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Financial Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Sales */}
        <Card className="border-slate-800 bg-slate-900/70 backdrop-blur shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Gross Sales
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview ? formatMinorToMoney(overview.gross_sales_minor, currency) : "..."}
            </div>
            <p className="text-xs text-slate-400 mt-1">Retail customer order volume</p>
          </CardContent>
        </Card>

        {/* Wholesale COGS */}
        <Card className="border-slate-800 bg-slate-900/70 backdrop-blur shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Wholesale COGS
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Building2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview ? formatMinorToMoney(overview.wholesale_cogs_minor, currency) : "..."}
            </div>
            <p className="text-xs text-slate-400 mt-1">Upstream vendor server costs</p>
          </CardContent>
        </Card>

        {/* Gateway & Refunds */}
        <Card className="border-slate-800 bg-slate-900/70 backdrop-blur shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Fees & Expenses
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview
                ? formatMinorToMoney(
                    (
                      BigInt(overview.gateway_charges_minor || "0") +
                      BigInt(overview.expenses_minor || "0") +
                      BigInt(overview.refunds_minor || "0")
                    ).toString(),
                    currency
                  )
                : "..."}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gateway + OPEX + Refunds
            </p>
          </CardContent>
        </Card>

        {/* Net Profit & Margin */}
        <Card className="border-slate-800 bg-slate-900/70 backdrop-blur shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Net Profit & Margin
            </CardTitle>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isNetPositive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                isNetPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {overview ? formatMinorToMoney(overview.net_profit_minor, currency) : "..."}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isNetPositive ? "default" : "destructive"}
                className="text-[11px] font-semibold"
              >
                {overview ? `${overview.profit_margin_pct.toFixed(1)}%` : "0%"} Margin
              </Badge>
              <span className="text-xs text-slate-400">bottom-line return</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet & Client Operations */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Active VPS Fleet
            </CardTitle>
            <Server className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview?.active_vps_count ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Running customer VPS instances</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Pending Fulfillment
            </CardTitle>
            <AlertCircle className="size-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {overview?.pending_fulfillment_count ?? 0}
            </div>
            <Link
              href="/purchases"
              className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1 mt-1 font-medium"
            >
              View pending orders →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Clients
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview?.total_clients_count ?? 0}
            </div>
            <Link
              href="/clients"
              className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1 mt-1 font-medium"
            >
              Manage clients roster →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Profitability Ranking Table */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-white text-lg font-semibold">
              Vendor Profitability & COGS Ranking
            </CardTitle>
            <CardDescription className="text-slate-400">
              Breakdown of wholesale costs vs retail sales across upstream server providers
            </CardDescription>
          </div>
          <Link href="/vendors" className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Directory & APIs →
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No vendor activity recorded for {currency} yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
                    <th className="py-3 px-3">Vendor</th>
                    <th className="py-3 px-3 text-center">Active VPS</th>
                    <th className="py-3 px-3 text-right">Gross Sales</th>
                    <th className="py-3 px-3 text-right">Wholesale Cost</th>
                    <th className="py-3 px-3 text-right">Vendor Expenses</th>
                    <th className="py-3 px-3 text-right">Net Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vendors.map((v) => {
                    const isProfit = BigInt(v.net_vendor_profit_minor || "0") >= 0n;
                    return (
                      <tr key={v.vendor_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-white">
                          {v.vendor_name}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300 font-mono text-xs">
                          {v.active_orders_count}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-200">
                          {formatMinorToMoney(v.gross_sales_minor, currency)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {formatMinorToMoney(v.wholesale_cost_minor, currency)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {formatMinorToMoney(v.vendor_expenses_minor, currency)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-semibold ${
                            isProfit ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatMinorToMoney(v.net_vendor_profit_minor, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Cashflow Trend */}
      {trend.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold">
              Monthly Cashflow & Profit Trend (Last 6 Months)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Aggregated sales volume, COGS, and bottom-line earnings by billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {trend.map((m) => {
                const profitPositive = BigInt(m.net_profit_minor || "0") >= 0n;
                return (
                  <div
                    key={m.year_month}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {m.year_month}
                      </div>
                      <div className="text-base font-bold text-white mt-1">
                        {formatMinorToMoney(m.sales_minor, currency)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Cost: {formatMinorToMoney(m.costs_minor, currency)}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-400">Net Profit</div>
                      <div
                        className={`text-xs font-bold ${
                          profitPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatMinorToMoney(m.net_profit_minor, currency)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Navigation Shortcuts */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link href="/clients" className="cursor-pointer">
          <Button
            size="sm"
            className="cursor-pointer bg-primary text-white hover:bg-primary/90 gap-1.5"
          >
            <Plus className="size-4" /> Add Client
          </Button>
        </Link>
        <Link href="/purchases" className="cursor-pointer">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
          >
            <ShoppingCart className="size-4" /> New Purchase
          </Button>
        </Link>
        <Link href="/packages" className="cursor-pointer">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
          >
            <Server className="size-4" /> Retail Packages
          </Button>
        </Link>
        <Link href="/financials" className="cursor-pointer">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
          >
            <Receipt className="size-4" /> Refunds & OPEX
          </Button>
        </Link>
        <Link href="/whmcs" className="cursor-pointer">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
          >
            <RefreshCw className="size-4" /> WHMCS Sync
          </Button>
        </Link>
      </div>
    </div>
  );
}
