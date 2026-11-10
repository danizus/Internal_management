import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";

describe("Health API & DB Connectivity Indicator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 and connected: true when DB responds", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
      rowCount: 1,
    } as never);

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database.connected).toBe(true);
    expect(typeof res.body.database.latency_ms).toBe("number");
  });

  it("returns 503 and connected: false gracefully when DB is unreachable", async () => {
    vi.spyOn(pool, "query").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:5432")
    );

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe("degraded");
    expect(res.body.database.connected).toBe(false);
    expect(res.body.database.error).toContain("ECONNREFUSED");
  });
});
