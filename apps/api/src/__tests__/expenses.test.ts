import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 6: Expenses API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleExpense = {
    expense_id: "901",
    vendor_id: "10",
    vendor_name: "Hetzner",
    expense_title: "Hetzner Monthly Dedicated Hardware Invoice",
    expense_description: "Invoice #HZ-8899 for Root Server DX",
    category: "infrastructure",
    expense_amount_minor: "4500",
    currency: "USD",
    expense_date: "2026-11-01T00:00:00.000Z",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
  };

  it("GET /api/expenses returns expenses filtered by category and text search", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleExpense],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/expenses")
      .set(authHeader())
      .query({ category: "infrastructure", q: "Invoice" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([sampleExpense]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("WHERE e.category = $1 AND"),
      ["infrastructure", "%Invoice%", 50]
    );
  });

  it("POST /api/expenses validates positive amount and category, then creates expense", async () => {
    // 1. Validation error: negative amount
    const badRes = await request(app)
      .post("/api/expenses")
      .set(authHeader())
      .send({
        expense_title: "Bad Amount",
        expense_amount_minor: "-500",
        currency: "USD",
      });
    expect(badRes.status).toBe(400);

    // 2. Success creation
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleExpense],
      rowCount: 1,
    } as never);

    const okRes = await request(app)
      .post("/api/expenses")
      .set(authHeader())
      .send({
        vendor_id: "10",
        expense_title: "Hetzner Monthly Dedicated Hardware Invoice",
        expense_description: "Invoice #HZ-8899 for Root Server DX",
        category: "infrastructure",
        expense_amount_minor: "4500",
        currency: "USD",
        expense_date: "2026-11-01T00:00:00.000Z",
      });

    expect(okRes.status).toBe(201);
    expect(okRes.body.ok).toBe(true);
    expect(okRes.body.data.expense_id).toBe("901");
    expect(okRes.body.data.expense_amount_minor).toBe("4500");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO expenses"),
      expect.arrayContaining(["10", "Hetzner Monthly Dedicated Hardware Invoice", "infrastructure", "4500", "USD"])
    );
  });

  it("PATCH /api/expenses/:id updates expense fields and returns 404 when missing", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [{ ...sampleExpense, expense_amount_minor: "5000" }],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .patch("/api/expenses/901")
      .set(authHeader())
      .send({ expense_amount_minor: "5000" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.expense_amount_minor).toBe("5000");

    // 404 case
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const missingRes = await request(app)
      .patch("/api/expenses/999")
      .set(authHeader())
      .send({ expense_title: "Nonexistent" });

    expect(missingRes.status).toBe(404);
  });

  it("DELETE /api/expenses/:id deletes expense record", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .delete("/api/expenses/901")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.expense_id).toBe("901");
  });

  it("GET /api/expenses returns 401 when unauthorized", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.status).toBe(401);
  });
});
