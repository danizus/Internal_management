import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter } from "../middleware/rateLimiter.js";

describe("Rate Limiter Middleware", () => {
  it("enforces request threshold and sends rate limit headers", async () => {
    const testApp = express();
    testApp.use(
      createRateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 3,
        message: "Test limit exceeded",
      })
    );
    testApp.get("/test", (req, res) => res.json({ ok: true }));

    // Request 1 -> 200
    const res1 = await request(testApp).get("/test");
    expect(res1.status).toBe(200);
    expect(res1.headers["x-ratelimit-limit"]).toBe("3");
    expect(res1.headers["x-ratelimit-remaining"]).toBe("2");

    // Request 2 -> 200
    const res2 = await request(testApp).get("/test");
    expect(res2.status).toBe(200);
    expect(res2.headers["x-ratelimit-remaining"]).toBe("1");

    // Request 3 -> 200
    const res3 = await request(testApp).get("/test");
    expect(res3.status).toBe(200);
    expect(res3.headers["x-ratelimit-remaining"]).toBe("0");

    // Request 4 -> 429
    const res4 = await request(testApp).get("/test");
    expect(res4.status).toBe(429);
    expect(res4.body.ok).toBe(false);
    expect(res4.body.error.message).toBe("Test limit exceeded");
    expect(res4.headers["retry-after"]).toBeDefined();
  });
});
