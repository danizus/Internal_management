import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "tam_token";

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
 * Parses a raw Cookie header into key-value pairs without external dependencies.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        cookies[decodeURIComponent(key)] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }

  return cookies;
}

/**
 * Sets an HttpOnly, SameSite=Lax cookie containing the auth token.
 */
export function setAuthCookie(
  res: Response,
  token: string,
  maxAgeSeconds = 7 * 24 * 60 * 60
): void {
  const isProduction = env.NODE_ENV === "production";

  const cookieOptions: string[] = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProduction) {
    cookieOptions.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieOptions.join("; "));
}

/**
 * Clears the auth cookie by setting an expired Max-Age.
 */
export function clearAuthCookie(res: Response): void {
  const isProduction = env.NODE_ENV === "production";

  const cookieOptions: string[] = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProduction) {
    cookieOptions.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieOptions.join("; "));
}
