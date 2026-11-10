import { Router } from "express";
import { z } from "zod";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

// Stricter rate limit for login attempts (15 attempts per 15 min per IP)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: "Too many login attempts. Please try again after 15 minutes.",
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().max(50).nullable().optional(),
  role: z.enum(["admin", "staff"]).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

authRouter.post(
  "/auth/register",
  validateBody(registerSchema),
  asyncHandler(authController.register)
);

authRouter.post(
  "/auth/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login)
);

authRouter.post(
  "/auth/logout",
  asyncHandler(authController.logout)
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(authController.me)
);
