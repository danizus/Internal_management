import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";

describe("Phase 4: Purchases & Order Fulfillment Lifecycle API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const samplePurchase = {
    purchase_id: "701",
    whmcs_order_id: "88",
    whmcs_service_id: "105",
    whmcs_invoice_id: "990",
    client_id: "201",
    client_name: "Daniyal Ahmed",
    client_email: "daniyal@example.com",
    display_package_id: "501",
    display_package_name: "DE Cloud VPS 4GB",
    vendor_id: "10",
    vendor_name: "Hetzner",
    package_id: "101",
    vendor_package_name: "CX22",
    ip_address: "188.114.97.2",
    hostname: "vps1.example.com",
    status: "active",
    sales_amount_minor: "1500",
    purchase_amount_minor: "600",
    processing_charges_minor: "75",
    profit_amount_minor: "825",
    currency: "USD",
    purchase_date: "2026-11-10T00:00:00.000Z",
    due_date: "2026-12-10T00:00:00.000Z",
    billing_cycle: "monthly",
    payment_method: "Stripe",
    created_at: "2026-11-10T00:00:00.000Z",
    updated_at: "2026-11-10T00:00:00.000Z",
  };

  it("GET /api/purchases returns list of purchases with filters", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [samplePurchase],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/purchases")
      .query({ status: "active", vendor_id: "10", due_within_days: 7, q: "Daniyal" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([samplePurchase]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("WHERE p.status = $1 AND p.vendor_id = $2"),
      ["active", "10", 7, "%Daniyal%"]
    );
  });

  it("POST /api/purchases creates a pending purchase with profit calculated", async () => {
    const pendingPurchase = {
      ...samplePurchase,
      vendor_id: null,
      package_id: null,
      ip_address: null,
      hostname: null,
      status: "pending_fulfillment",
      purchase_amount_minor: "0",
      processing_charges_minor: "50",
      profit_amount_minor: "1450", // 1500 - 0 - 50 = 1450
    };

    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [pendingPurchase],
      rowCount: 1,
    } as never);

    const res = await request(app).post("/api/purchases").send({
      client_id: "201",
      display_package_id: "501",
      sales_amount_minor: "1500",
      processing_charges_minor: "50",
      currency: "usd",
      status: "pending_fulfillment",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending_fulfillment");
    expect(res.body.data.profit_amount_minor).toBe("1450");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO purchases"),
      expect.arrayContaining(["1500", "0", "50", "1450", "USD"])
    );
  });

  it("POST /api/purchases/:id/fulfill fulfills pending order and increments counters in transaction", async () => {
    const pendingExisting = {
      ...samplePurchase,
      status: "pending_fulfillment",
      vendor_id: null,
      package_id: null,
      ip_address: null,
      hostname: null,
      sales_amount_minor: "2000",
      purchase_amount_minor: "0",
      processing_charges_minor: "100",
      profit_amount_minor: "1900",
    };

    const fulfilledPurchase = {
      ...samplePurchase,
      sales_amount_minor: "2000",
      purchase_amount_minor: "800",
      processing_charges_minor: "100",
      profit_amount_minor: "1100", // 2000 - 800 - 100 = 1100
      status: "active",
      vendor_id: "10",
      package_id: "101",
      ip_address: "1.2.3.4",
      hostname: "srv1.test.com",
    };

    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [pendingExisting], rowCount: 1 }) // SELECT
      .mockResolvedValueOnce({ rows: [fulfilledPurchase], rowCount: 1 }) // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE vendor sales count
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE pkg sales count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    const res = await request(app)
      .post("/api/purchases/701/fulfill")
      .send({
        vendor_id: "10",
        package_id: "101",
        ip_address: "1.2.3.4",
        hostname: "srv1.test.com",
        purchase_amount_minor: "800",
        processing_charges_minor: "100",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("active");
    expect(res.body.data.profit_amount_minor).toBe("1100");
    expect(clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE vendors"),
      ["10"]
    );
    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE vendor_packages"),
      ["101"]
    );
    expect(clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("POST /api/purchases returns 409 on duplicate whmcs_service_id (PG 23505)", async () => {
    const pgErr = Object.assign(new Error("duplicate service id"), {
      code: "23505",
    });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app).post("/api/purchases").send({
      whmcs_service_id: "105",
      client_id: "201",
      sales_amount_minor: "1000",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("whmcs_service_id");
  });

  it("DELETE /api/purchases/:id returns 409 when refunds reference it (PG 23503)", async () => {
    const pgErr = Object.assign(new Error("fk constraint"), { code: "23503" });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app).delete("/api/purchases/701");
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("refunds reference it");
  });
});
