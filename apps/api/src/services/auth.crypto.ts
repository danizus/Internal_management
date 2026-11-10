import crypto from "node:crypto";
import { promisify } from "node:util";
import { env } from "../config/env.js";

const scryptAsync = promisify(crypto.scrypt);

export interface TokenPayload {
  user_id: string;
  email: string;
  role: "admin" | "staff";
  exp: number; // unix timestamp in seconds
}

/**
 * Hashes a plaintext password using native scrypt with a random 16-byte salt.
 * Returns formatted as `salt:keyHex`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a password against the stored `salt:keyHex` hash using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;

  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Creates a signed stateless token using HMAC-SHA256 with env.SESSION_SECRET.
 * Defaults to 7 days validity.
 */
export function generateToken(
  user: { user_id: string; email: string; role: "admin" | "staff" },
  expiresInSeconds = 7 * 24 * 60 * 60
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: TokenPayload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed token. Returns null if invalid or expired.
 */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (signature.length !== expectedSignature.length) return null;
  const validSig = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  if (!validSig) return null;

  try {
    const decodedPayload = JSON.parse(
      base64UrlDecode(payload)
    ) as TokenPayload;
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedPayload;
  } catch {
    return null;
  }
}
