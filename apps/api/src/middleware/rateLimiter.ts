import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes default
  const maxRequests = options.maxRequests ?? 100; // 100 requests default
  const message =
    options.message ?? "Too many requests. Please try again later.";

  const store = new Map<string, RateLimitRecord>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip =
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    let record = store.get(ip);

    if (!record || now >= record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader("Retry-After", resetSeconds.toString());
      res.status(429).json({
        ok: false,
        error: {
          message,
          retry_after_seconds: resetSeconds,
        },
      });
      return;
    }

    next();
  };
}

// Default global 100 req/15min rate limiter
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  message: "Too many requests. Limit is 100 requests per 15 minutes.",
});
