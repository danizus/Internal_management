import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../services/auth.crypto.js";
import { parseCookies, AUTH_COOKIE_NAME } from "../utils/cookies.js";
import { HttpError } from "./errorHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      cookies?: Record<string, string>;
    }
  }
}

/**
 * Lightweight middleware that attaches parsed cookies to req.cookies.
 */
export function cookieParserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.cookies = parseCookies(req.headers.cookie);
  next();
}

/**
 * Middleware that extracts and verifies authentication token:
 * 1. Checks HttpOnly cookie `tam_token` first (browser).
 * 2. Falls back to `Authorization: Bearer <token>` (API / CLI).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // 1. Check HttpOnly cookie
  const cookies = req.cookies || parseCookies(req.headers.cookie);
  let token = cookies[AUTH_COOKIE_NAME];

  // 2. Fallback to Authorization: Bearer
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    throw new HttpError(
      401,
      "Authentication required. Please log in or provide a Bearer token."
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new HttpError(401, "Invalid or expired authentication session.");
  }

  req.user = payload;
  next();
}

/**
 * Role-based authorization middleware (e.g. requireRole('admin')).
 */
export function requireRole(allowedRole: "admin" | "staff") {
  return function roleCheck(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      throw new HttpError(401, "Authentication required.");
    }

    if (allowedRole === "admin" && req.user.role !== "admin") {
      throw new HttpError(403, "Access forbidden. Admin role required.");
    }

    next();
  };
}
