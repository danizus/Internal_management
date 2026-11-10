import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";

describe("Phase 5: WHMCS Webhook Receiver API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validPayload = {
    event: "order_paid",
    order_id: "101",
    service_id: "505",
    invoice_id: "990",
    product_id: "42", // whmcs_pid
    amount: "15.00",
    currency: "USD",
    billing_cycle: "monthly",
    payment_method: "Stripe",
    due_date: "2026-12-10T00:00:00.000Z",
    client: {
      client_id: "15",
      name: "Daniyal Ahmed",
      email: "daniyal@example.com",
      phone: "+923001234567",
      company: "CloudTech",
    },
  };

  function signPayload(payloadObj: object, secret: string = env.WHMCS_WEBHOOK_SECRET): {
    raw: string;
    signature: string;
  } {
    const raw = JSON.stringify(payloadObj);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");
    return { raw, signature };
  }

  it("POST /api/webhooks/whmcs accepts valid HMAC signature, upserts client and creates pending purchase", async () => {
    const { raw, signature } = signPayload(validPayload);

    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ purchase_id: "701" }], rowCount: 1 }) // INSERT purchase
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    vi.spyOn(pool, "query")
      // Upsert client query
      .mockResolvedValueOnce({ rows: [{ client_id: "201" }], rowCount: 1 } as never)
      // Find display package by whmcs_pid query
      .mockResolvedValueOnce({
        rows: [
          {
            display_package_id: "501",
            upstream_price_minor: "550", // $5.50
          },
        ],
        rowCount: 1,
      } as never)
      // Insert sync log query
      .mockResolvedValueOnce({ rows: [{ sync_id: "1" }], rowCount: 1 } as never);

    const res = await request(app)
      .post("/api/webhooks/whmcs")
      .set("X-WHMCS-Signature", signature)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.client_id).toBe("201");
    expect(res.body.data.purchase_id).toBe("701");
    expect(clientQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("POST /api/webhooks/whmcs rejects missing or invalid HMAC signature with 401", async () => {
    // Missing signature header
    const resNoSig = await request(app)
      .post("/api/webhooks/whmcs")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(validPayload));

    expect(resNoSig.status).toBe(401);
    expect(resNoSig.body.error.message).toContain("HMAC");

    // Invalid/Tampered signature header
    const { raw } = signPayload(validPayload);
    const resBadSig = await request(app)
      .post("/api/webhooks/whmcs")
      .set("X-WHMCS-Signature", "0000000000000000000000000000000000000000000000000000000000000000")
      .set("Content-Type", "application/json")
      .send(raw);

    expect(resBadSig.status).toBe(401);
  });

  it("POST /api/webhooks/whmcs updates status on service_status_change", async () => {
    const statusPayload = {
      event: "service_status_change",
      service_id: "505",
      status: "Suspended",
      client: {
        client_id: "15",
        name: "Daniyal Ahmed",
        email: "daniyal@example.com",
      },
    };

    const { raw, signature } = signPayload(statusPayload);

    vi.spyOn(pool, "query")
      // Upsert client
      .mockResolvedValueOnce({ rows: [{ client_id: "201" }], rowCount: 1 } as never)
      // Update purchase status
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      // Insert log
      .mockResolvedValueOnce({ rows: [{ sync_id: "3" }], rowCount: 1 } as never);

    const res = await request(app)
      .post("/api/webhooks/whmcs")
      .set("X-WHMCS-Signature", signature)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.client_id).toBe("201");
  });
});
