import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";

describe("Phase 3: Retail Catalog (display_packages) & Margin Calculator API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleDbRow = {
    display_package_id: "501",
    whmcs_pid: "42",
    vendor_id: "10",
    vendor_name: "Hetzner",
    default_vendor_package_id: "101",
    default_vendor_package_name: "CX22",
    upstream_price_minor: "550",
    upstream_currency: "USD",
    country_id: "1",
    country_name: "Germany",
    iso_code: "DE",
    package_name: "DE Cloud VPS 4GB",
    cpu_cores: "2 vCPU",
    ram: "4 GB",
    storage: "40 GB NVMe",
    operating_system: "Ubuntu 24.04",
    bandwidth: "20 TB",
    dedicated_ip: "1 IPv4",
    price_minor: "1200",
    currency: "USD",
    billing_cycle: "monthly",
    is_active: true,
    created_at: "2026-11-10T00:00:00.000Z",
    updated_at: "2026-11-10T00:00:00.000Z",
  };

  it("GET /api/display-packages returns retail packages enriched with estimated_margin_minor", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleDbRow],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/display-packages")
      .query({ country_id: "1", vendor_id: "10", is_active: "true", q: "Cloud" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    // $12.00 (1200) retail - $5.50 (550) upstream = $6.50 (650) margin
    expect(res.body.data[0].estimated_margin_minor).toBe("650");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(
        "WHERE dp.country_id = $1 AND dp.vendor_id = $2 AND dp.is_active = $3"
      ),
      ["1", "10", true, "%Cloud%"]
    );
  });

  it("GET /api/display-packages sets estimated_margin_minor to null when currencies differ", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          ...sampleDbRow,
          currency: "USD",
          upstream_currency: "EUR",
        },
      ],
      rowCount: 1,
    } as never);

    const res = await request(app).get("/api/display-packages");
    expect(res.status).toBe(200);
    expect(res.body.data[0].estimated_margin_minor).toBeNull();
  });

  it("POST /api/display-packages creates a retail package with whmcs_pid and computes margin", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [sampleDbRow],
      rowCount: 1,
    } as never);

    const res = await request(app).post("/api/display-packages").send({
      whmcs_pid: "42",
      vendor_id: "10",
      default_vendor_package_id: "101",
      country_id: "1",
      package_name: "DE Cloud VPS 4GB",
      cpu_cores: "2 vCPU",
      ram: "4 GB",
      storage: "40 GB NVMe",
      operating_system: "Ubuntu 24.04",
      bandwidth: "20 TB",
      dedicated_ip: "1 IPv4",
      price_minor: "1200",
      currency: "usd",
      billing_cycle: "monthly",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.display_package_id).toBe("501");
    expect(res.body.data.whmcs_pid).toBe("42");
    expect(res.body.data.estimated_margin_minor).toBe("650");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO display_packages"),
      [
        "42",
        "10",
        "101",
        "1",
        "DE Cloud VPS 4GB",
        "2 vCPU",
        "4 GB",
        "40 GB NVMe",
        "Ubuntu 24.04",
        "20 TB",
        "1 IPv4",
        "1200",
        "USD",
        "monthly",
        true,
      ]
    );
  });

  it("POST /api/display-packages returns 409 on duplicate whmcs_pid (PG 23505)", async () => {
    const pgErr = Object.assign(new Error("duplicate whmcs_pid"), {
      code: "23505",
    });
    vi.spyOn(pool, "query").mockRejectedValueOnce(pgErr);

    const res = await request(app).post("/api/display-packages").send({
      whmcs_pid: "42",
      country_id: "1",
      package_name: "Duplicate PID Plan",
      ram: "2 GB",
      storage: "20 GB",
      operating_system: "Ubuntu",
      bandwidth: "10 TB",
      dedicated_ip: "1 IPv4",
      price_minor: "900",
      currency: "USD",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("whmcs_pid");
  });

  it("PATCH /api/display-packages/:id updates retail package and returns 404 when missing", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const res = await request(app)
      .patch("/api/display-packages/999")
      .send({ price_minor: "1500" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/display-packages/:id deletes retail package", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    } as never);

    const res = await request(app).delete("/api/display-packages/501");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: { display_package_id: "501" },
    });
  });
});
