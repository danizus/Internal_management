import { generateToken } from "../services/auth.crypto.js";

export function getTestAuthToken(role: "admin" | "staff" = "admin"): string {
  return generateToken({
    user_id: "1",
    email: "admin@example.com",
    role,
  });
}

export function authHeader(role: "admin" | "staff" = "admin"): { Authorization: string } {
  return { Authorization: `Bearer ${getTestAuthToken(role)}` };
}

export function authCookie(role: "admin" | "staff" = "admin"): string {
  return `tam_token=${getTestAuthToken(role)}`;
}
