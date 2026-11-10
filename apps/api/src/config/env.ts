import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@localhost:5432/tam"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-session-secret-change-in-production"),
  WHMCS_WEBHOOK_SECRET: z.string().default("dev-whmcs-webhook-secret"),
  WHMCS_API_URL: z.string().default(""),
  WHMCS_API_IDENTIFIER: z.string().default(""),
  WHMCS_API_SECRET: z.string().default(""),
});

export const env = envSchema.parse(process.env);
