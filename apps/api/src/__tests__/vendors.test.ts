import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { authHeader } from "./testAuth.js";

describe("Phase 2: Vendors & Wholesale Vendor Packages API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/vendors returns list of vendors with package_count", async () => {
    const mockVendors = [
      {
        vendor_id: "10",
        vendor_name: "Hetzner",
        vendor_website: "https://hetzner.com",
        vendor_rating: "4.80",
        vendor_sales_count: 15,
        notes: "Reliable EU provider",
        package_count: 4,
        created_at: "2026-11-10T00:00:00.000Z",
        updated_at: "2026-11-10T00:00:00.000Z",
      },
    ];
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockVendors,
      rowCount: 1,
    } as never);

    const res = await request(app).get("/api/vendors").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: mockVendors });
  });

  it("POST /api/vendors validates rating bounds and creates a vendor", async () => {
    const badRes = await request(app)
      .post("/api/vendors")
      .set(authHeader())
      .send({ vendor_name: "Bad Vendor", vendor_rating: 6.5 });
    expect(badRes.status).toBe(400);

    const createdVendor = {
      vendor_id: "11",
      vendor_name: "Contabo",
      vendor_website: "https://contabo.com",
      vendor_rating: "4.10",
      vendor_sales_count: 0,
      notes: null,
      package_count: 0,
      created_at: "2026-11-10T00:00:00.000Z",
      updated_at: "2026-11-10T00:00:00.000Z",
    };
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [createdVendor],
      rowCount: 1,
    } as never);

    const okRes = await request(app)
      .post("/api/vendors")
      .set(authHeader())
      .send({
        vendor_name: "Contabo",
        vendor_website: "https://contabo.com",
        vendor_rating: 4.1,
      });

    expect(okRes.status).toBe(201);
    expect(okRes.body.data.vendor_id).toBe("11");
  });

  it("GET /api/vendor-packages applies parameterized filters cleanly", async () => {
    const mockPackages = [
      {
        package_id: "101",
        vendor_id: "10",
        vendor_name: "Hetzner",
        vendor_rating: "4.80",
        country_id: "1",
        country_name: "Germany",
        iso_code: "DE",
        package_name: "CX22",
        cpu_cores: "2 vCPU",
        ram: "4 GB",
        storage: "40 GB NVMe",
        operating_system: "Ubuntu 24.04",
        bandwidth: "20 TB",
        dedicated_ip: "1 IPv4",
        price_minor: "450",
        currency: "EUR",
        billing_cycle: "monthly",
        package_sales_count: 3,
        is_active: true,
        created_at: "2026-11-10T00:00:00.000Z",
        updated_at: "2026-11-10T00:00:00.000Z",
      },
    ];
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: mockPackages,
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/vendor-packages")
      .set(authHeader())
      .query({
        vendor_id: "10",
        country_id: "1",
        operating_system: "Ubuntu",
        max_price_minor: "1000",
        is_active: "true",
        q: "NVMe",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: mockPackages });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("WHERE vp.vendor_id = $1 AND vp.country_id = $2"),
      ["10", "1", "%Ubuntu%", "1000", true, "%NVMe%"]
    );
  });

  it("POST /api/vendor-packages creates wholesale package with bigint minor price and currency", async () => {
    const createdPkg = {
      package_id: "102",
      vendor_id: "10",
      vendor_name: "Hetzner",
      vendor_rating: "4.80",
      country_id: "1",
      country_name: "Germany",
      iso_code: "DE",
      package_name: "CPX31",
      cpu_cores: "4 vCPU",
      ram: "8 GB",
      storage: "160 GB NVMe",
      operating_system: "Debian 12",
      bandwidth: "20 TB",
      dedicated_ip: "1 IPv4",
      price_minor: "1390",
      currency: "usd",
      billing_cycle: "monthly",
      package_sales_count: 0,
      is_active: true,
      created_at: "2026-11-10T00:00:00.000Z",
      updated_at: "2026-11-10T00:00:00.000Z",
    };

    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [{ ...createdPkg, currency: "USD" }],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .post("/api/vendor-packages")
      .set(authHeader())
      .send({
        vendor_id: "10",
        country_id: "1",
        package_name: "CPX31",
        cpu_cores: "4 vCPU",
        ram: "8 GB",
        storage: "160 GB NVMe",
        operating_system: "Debian 12",
        bandwidth: "20 TB",
        dedicated_ip: "1 IPv4",
        price_minor: "1390",
        currency: "usd",
        billing_cycle: "monthly",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.price_minor).toBe("1390");
    expect(res.body.data.currency).toBe("USD");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO vendor_packages"),
      [
        "10",
        "1",
        "CPX31",
        "4 vCPU",
        "8 GB",
        "160 GB NVMe",
        "Debian 12",
        "20 TB",
        "1 IPv4",
        "1390",
        "USD",
        "monthly",
        true,
      ]
    );
  });

  it("DELETE /api/vendor-packages/:id returns 404 when package does not exist", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as never);

    const res = await request(app)
      .delete("/api/vendor-packages/999")
      .set(authHeader());
    expect(res.status).toBe(404);
  });
});
