import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 4: Clients API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleClient = {
    client_id: "201",
    whmcs_client_id: "15",
    client_name: "Daniyal Ahmed",
    client_email: "daniyal@example.com",
    client_phone: "+923001234567",
    company_name: "CloudTech Ltd",
    status: "active",
    purchase_count: 3,
    created_at: "2026-11-10T00:00:00.000Z",
    updated_at: "2026-11-10T00:00:00.000Z",
  };

  it("GET /api/clients returns list of clients with stringified bigint IDs", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleClient],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/clients")
      .set(authHeader())
      .query({ status: "active", q: "Daniyal" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([sampleClient]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("WHERE c.status = $1 AND"),
      ["active", "%Daniyal%"]
    );
  });

  it("POST /api/clients normalizes email and creates a client", async () => {
    const created = {
      ...sampleClient,
      client_email: "test@example.com",
    };
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [created],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .post("/api/clients")
      .set(authHeader())
      .send({
        whmcs_client_id: "15",
        client_name: "Test Client",
        client_email: "  TEST@EXAMPLE.COM  ",
        company_name: "Test Org",
        status: "active",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.client_email).toBe("test@example.com");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO clients"),
      ["15", "Test Client", "test@example.com", null, "Test Org", "active"]
    );
  });

  it("POST /api/clients returns 409 on duplicate whmcs_client_id (PG 23505)", async () => {
    const pgErr = Object.assign(new Error("duplicate whmcs_client_id"), {
      code: "23505",
    });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app)
      .post("/api/clients")
      .set(authHeader())
      .send({
        whmcs_client_id: "15",
        client_name: "Duplicate Client",
        client_email: "dup@example.com",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("WHMCS Client ID");
  });

  it("PATCH /api/clients/:id updates client and returns 404 when missing", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const res = await request(app)
      .patch("/api/clients/999")
      .set(authHeader())
      .send({ client_name: "Nonexistent" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/clients/:id returns 409 when purchases reference the client (PG 23503)", async () => {
    const pgErr = Object.assign(new Error("fk constraint"), { code: "23503" });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app)
      .delete("/api/clients/201")
      .set(authHeader());
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("purchases or refunds reference it");
  });
});
