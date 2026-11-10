import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 2: Countries Lookup API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/countries returns list of countries with stringified bigint IDs", async () => {
    const mockRows = [
      {
        country_id: "1",
        country_name: "Germany",
        iso_code: "DE",
        created_at: "2026-11-10T00:00:00.000Z",
        updated_at: "2026-11-10T00:00:00.000Z",
      },
    ];
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockRows,
      rowCount: 1,
    } as never);

    const res = await request(app).get("/api/countries").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: mockRows });
  });

  it("POST /api/countries validates input and creates a country", async () => {
    const createdRow = {
      country_id: "2",
      country_name: "United States",
      iso_code: "US",
      created_at: "2026-11-10T00:00:00.000Z",
      updated_at: "2026-11-10T00:00:00.000Z",
    };
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [createdRow],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .post("/api/countries")
      .set(authHeader())
      .send({ country_name: "  United States ", iso_code: "us" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, data: createdRow });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO countries"), [
      "United States",
      "US",
    ]);
  });

  it("POST /api/countries returns 400 on invalid ISO code", async () => {
    const res = await request(app)
      .post("/api/countries")
      .set(authHeader())
      .send({ country_name: "Germany", iso_code: "GERMANY" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/countries returns 409 on duplicate country/ISO code (PG 23505)", async () => {
    const pgErr = Object.assign(new Error("duplicate key"), { code: "23505" });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app)
      .post("/api/countries")
      .set(authHeader())
      .send({ country_name: "Germany", iso_code: "DE" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("already exists");
  });

  it("PATCH /api/countries/:id updates country and returns 404 when missing", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const res = await request(app)
      .patch("/api/countries/999")
      .set(authHeader())
      .send({ country_name: "Netherlands" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Country not found");
  });

  it("DELETE /api/countries/:id returns 409 when referenced by packages (PG 23503)", async () => {
    const pgErr = Object.assign(new Error("fk constraint"), { code: "23503" });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app).delete("/api/countries/1").set(authHeader());

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("packages reference it");
  });
});
