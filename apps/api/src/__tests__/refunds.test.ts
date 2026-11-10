import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 6: Refunds API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleRefund = {
    refund_id: "801",
    purchase_id: "701",
    client_id: "201",
    client_name: "Daniyal Ahmed",
    client_email: "daniyal@example.com",
    vendor_id: "10",
    vendor_name: "Hetzner",
    display_package_id: "501",
    display_package_name: "DE Cloud VPS 4GB",
    refund_amount_minor: "1250",
    currency: "USD",
    whmcs_transaction_id: "TX-9988",
    reason: "Customer requested cancellation within 24h",
    refund_date: "2026-11-10T00:00:00.000Z",
    created_at: "2026-11-10T00:00:00.000Z",
    updated_at: "2026-11-10T00:00:00.000Z",
  };

  it("GET /api/refunds returns list of refunds with joined client and vendor names", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleRefund],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/refunds")
      .set(authHeader())
      .query({ purchase_id: "701", client_id: "201" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([sampleRefund]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("WHERE r.purchase_id = $1 AND r.client_id = $2"),
      ["701", "201", 50]
    );
  });

  it("POST /api/refunds creates refund and updates purchase status to 'refunded' when full", async () => {
    // 1. getPurchaseByIdDb
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          purchase_id: "701",
          client_id: "201",
          vendor_id: "10",
          display_package_id: "501",
          sales_amount_minor: "1250",
          currency: "USD",
          status: "active",
        },
      ],
      rowCount: 1,
    } as never);

    // 2. Transaction queries
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ sales_amount_minor: "1250", status: "active" }],
        rowCount: 1,
      }) // SELECT purchase FOR UPDATE
      .mockResolvedValueOnce({
        rows: [{ total: "0" }],
        rowCount: 1,
      }) // SELECT SUM(refund_amount_minor)
      .mockResolvedValueOnce({
        rows: [{ refund_id: "801" }],
        rowCount: 1,
      }) // INSERT INTO refunds
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE purchases SET status = 'refunded'
      .mockResolvedValueOnce({
        rows: [sampleRefund],
        rowCount: 1,
      }) // SELECT joined refund row
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    const res = await request(app)
      .post("/api/refunds")
      .set(authHeader())
      .send({
        purchase_id: "701",
        refund_amount_minor: "1250",
        whmcs_transaction_id: "TX-9988",
        reason: "Customer requested cancellation within 24h",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.refund_id).toBe("801");
    expect(res.body.data.refund_amount_minor).toBe("1250");
    expect(clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE purchases"),
      ["701"]
    );
    expect(clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("POST /api/refunds rejects refund when total exceeds sales amount", async () => {
    // 1. getPurchaseByIdDb
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          purchase_id: "701",
          client_id: "201",
          sales_amount_minor: "1000",
          currency: "USD",
        },
      ],
      rowCount: 1,
    } as never);

    // 2. Transaction queries: already refunded 500, attempting 600 (total 1100 > 1000)
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ sales_amount_minor: "1000", status: "active" }],
        rowCount: 1,
      }) // SELECT purchase FOR UPDATE
      .mockResolvedValueOnce({
        rows: [{ total: "500" }],
        rowCount: 1,
      }) // SELECT existing refunds
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    const res = await request(app)
      .post("/api/refunds")
      .set(authHeader())
      .send({
        purchase_id: "701",
        refund_amount_minor: "600",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("cannot exceed purchase sales amount");
    expect(clientQuery).toHaveBeenCalledWith("ROLLBACK");
  });

  it("DELETE /api/refunds/:id removes refund and returns purchase_id", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ purchase_id: "701" }],
        rowCount: 1,
      }) // SELECT purchase_id FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE FROM refunds
      .mockResolvedValueOnce({
        rows: [{ sales_amount_minor: "1250", status: "refunded" }],
        rowCount: 1,
      }) // SELECT purchase status
      .mockResolvedValueOnce({
        rows: [{ total: "0" }],
        rowCount: 1,
      }) // remaining refunds
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE purchases SET status = 'active'
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    const res = await request(app)
      .delete("/api/refunds/801")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.refund_id).toBe("801");
    expect(res.body.data.purchase_id).toBe("701");
  });

  it("POST /api/refunds returns 401 when unauthorized", async () => {
    const res = await request(app).post("/api/refunds").send({
      purchase_id: "701",
      refund_amount_minor: "500",
    });
    expect(res.status).toBe(401);
  });
});
