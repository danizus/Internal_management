import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../../../.env");
const localEnvPath = path.resolve(process.cwd(), ".env");

if (typeof process.loadEnvFile === "function") {
  if (fs.existsSync(rootEnvPath)) {
    process.loadEnvFile(rootEnvPath);
  } else if (fs.existsSync(localEnvPath)) {
    process.loadEnvFile(localEnvPath);
  }
}

const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:karachi786@localhost:5432/postgres"),
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
