import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 6: Executive Financials API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/financials/overview computes executive KPIs, net profit, and profit margin %", async () => {
    // 1. purchases aggregate: gross sales = 10000 ($100), cogs = 4000 ($40), charges = 500 ($5)
    // 2. refunds aggregate: refunds = 1000 ($10)
    // 3. expenses aggregate: expenses = 1500 ($15)
    // 4. counts: active = 5, pending = 2, clients = 10
    // Net profit = 10000 - 4000 - 500 - 1000 - 1500 = 3000 ($30.00)
    // Margin % = (3000 / 10000) * 100 = 30%
    vi.spyOn(pool, "query")
      .mockResolvedValueOnce({
        rows: [
          {
            gross_sales_minor: "10000",
            wholesale_cogs_minor: "4000",
            gateway_charges_minor: "500",
          },
        ],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ refunds_minor: "1000" }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ expenses_minor: "1500" }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            active_vps_count: 5,
            pending_fulfillment_count: 2,
            total_clients_count: 10,
          },
        ],
        rowCount: 1,
      } as never);

    const res = await request(app)
      .get("/api/financials/overview")
      .set(authHeader())
      .query({ currency: "USD" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.gross_sales_minor).toBe("10000");
    expect(res.body.data.wholesale_cogs_minor).toBe("4000");
    expect(res.body.data.gateway_charges_minor).toBe("500");
    expect(res.body.data.refunds_minor).toBe("1000");
    expect(res.body.data.expenses_minor).toBe("1500");
    expect(res.body.data.net_profit_minor).toBe("3000");
    expect(res.body.data.profit_margin_pct).toBe(30);
    expect(res.body.data.active_vps_count).toBe(5);
    expect(res.body.data.pending_fulfillment_count).toBe(2);
    expect(res.body.data.total_clients_count).toBe(10);
  });

  it("GET /api/financials/vendors returns vendor financial performance ranking", async () => {
    const mockVendorStats = [
      {
        vendor_id: "10",
        vendor_name: "Hetzner",
        active_orders_count: 4,
        gross_sales_minor: "8000",
        wholesale_cost_minor: "3000",
        vendor_expenses_minor: "500",
        currency: "USD",
      },
    ];

    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockVendorStats,
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/financials/vendors")
      .set(authHeader())
      .query({ currency: "USD" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].vendor_name).toBe("Hetzner");
    // 8000 - 3000 - 500 = 4500
    expect(res.body.data[0].net_vendor_profit_minor).toBe("4500");
  });

  it("GET /api/financials/trend returns historical monthly cashflow time series", async () => {
    const mockTrend = [
      {
        year_month: "2026-10",
        sales_minor: "5000",
        costs_minor: "2000",
        refunds_minor: "500",
        expenses_minor: "500",
        currency: "USD",
      },
      {
        year_month: "2026-11",
        sales_minor: "9000",
        costs_minor: "3500",
        refunds_minor: "0",
        expenses_minor: "1000",
        currency: "USD",
      },
    ];

    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockTrend,
      rowCount: 2,
    } as never);

    const res = await request(app)
      .get("/api/financials/trend")
      .set(authHeader())
      .query({ currency: "USD", months: 6 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // 2026-10: 5000 - 2000 - 500 - 500 = 2000
    expect(res.body.data[0].net_profit_minor).toBe("2000");
    // 2026-11: 9000 - 3500 - 0 - 1000 = 4500
    expect(res.body.data[1].net_profit_minor).toBe("4500");
  });

  it("GET /api/financials/overview returns 401 when unauthorized", async () => {
    const res = await request(app).get("/api/financials/overview");
    expect(res.status).toBe(401);
  });
});
