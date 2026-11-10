import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { generateToken } from "../services/auth.crypto.js";
import * as whmcsApiService from "../services/whmcsApi.service.js";

describe("Phase 5: WHMCS API Reconciliation & Sync Center", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const authToken = generateToken({
    user_id: "1",
    email: "admin@example.com",
    role: "admin",
  });

  it("GET /api/whmcs/status returns WHMCS configuration status", async () => {
    const res = await request(app)
      .get("/api/whmcs/status")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.data.has_webhook_secret).toBe("boolean");
  });

  it("GET /api/whmcs/logs returns sync audit logs", async () => {
    const mockLogs = [
      {
        sync_id: "10",
        source: "webhook",
        event_type: "order_paid",
        external_id: "505",
        payload: { event: "order_paid" },
        status: "processed",
        error_message: null,
        created_at: "2026-11-10T00:00:00.000Z",
      },
    ];

    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockLogs,
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/whmcs/logs")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual(mockLogs);
  });

  it("POST /api/whmcs/sync executes reconciliation service and returns summary", async () => {
    vi.spyOn(whmcsApiService, "syncFromWhmcsService").mockResolvedValueOnce({
      orders_synced: 3,
      clients_upserted: 2,
      errors: [],
    });

    const res = await request(app)
      .post("/api/whmcs/sync")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({
      orders_synced: 3,
      clients_upserted: 2,
      errors: [],
    });
  });
});
