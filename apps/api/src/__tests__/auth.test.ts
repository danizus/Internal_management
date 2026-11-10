import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { hashPassword, generateToken } from "../services/auth.crypto.js";

describe("Authentication & Security Module", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockUserRow = {
    user_id: "1",
    name: "Admin User",
    email: "admin@example.com",
    password_hash: "",
    phone: "+1234567890",
    profile_img: null,
    role: "admin",
    status: true,
    created_at: "2026-11-10T00:00:00.000Z",
    updated_at: "2026-11-10T00:00:00.000Z",
  };

  it("registers first user as admin with hashed password and returns token", async () => {
    // 1st query: check existing email -> null
    // 2nd query: count users -> 0 (first user becomes admin)
    // 3rd query: insert user
    vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ count: "0" }], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: "1",
            name: "First Admin",
            email: "admin@example.com",
            role: "admin",
            status: true,
            created_at: "2026-11-10T00:00:00.000Z",
            updated_at: "2026-11-10T00:00:00.000Z",
          },
        ],
        rowCount: 1,
      } as never);

    const res = await request(app).post("/api/auth/register").send({
      name: "First Admin",
      email: "admin@example.com",
      password: "SuperSecretPassword123",
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.role).toBe("admin");
    expect(typeof res.body.data.token).toBe("string");
  });

  it("authenticates valid login and rejects invalid password", async () => {
    const hashed = await hashPassword("MyCorrectPassword");
    const userWithHash = { ...mockUserRow, password_hash: hashed };

    // Valid login
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [userWithHash],
      rowCount: 1,
    } as never);

    const successRes = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "MyCorrectPassword",
    });

    expect(successRes.status).toBe(200);
    expect(successRes.body.ok).toBe(true);
    expect(typeof successRes.body.data.token).toBe("string");

    // Validates HttpOnly cookie is set
    const setCookie = successRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie);
    expect(cookieStr).toContain("tam_token=");
    expect(cookieStr.toLowerCase()).toContain("httponly");
    expect(cookieStr.toLowerCase()).toContain("samesite=lax");

    // Invalid login password
    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [userWithHash],
      rowCount: 1,
    } as never);

    const failRes = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword",
    });

    expect(failRes.status).toBe(401);
    expect(failRes.body.error.message).toContain("Invalid email or password");
  });

  it("GET /api/auth/me returns current user when valid Bearer token provided", async () => {
    const token = generateToken({
      user_id: "1",
      email: "admin@example.com",
      role: "admin",
    });

    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          user_id: "1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          status: true,
        },
      ],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.email).toBe("admin@example.com");
  });

  it("GET /api/auth/me authenticates via HttpOnly tam_token cookie", async () => {
    const token = generateToken({
      user_id: "1",
      email: "admin@example.com",
      role: "admin",
    });

    vi.spyOn(pool, "query").mockResolvedValueOnce({
      rows: [
        {
          user_id: "1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          status: true,
        },
      ],
      rowCount: 1,
    } as never);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `tam_token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Admin User");
  });

  it("POST /api/auth/logout clears auth cookie", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie);
    expect(cookieStr).toContain("tam_token=");
    expect(cookieStr.toLowerCase()).toContain("max-age=0");
  });

  it("GET /api/auth/me returns 401 when Authorization header is missing or invalid", async () => {
    const missingRes = await request(app).get("/api/auth/me");
    expect(missingRes.status).toBe(401);

    const invalidRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-tampered-token");
    expect(invalidRes.status).toBe(401);
  });
});
