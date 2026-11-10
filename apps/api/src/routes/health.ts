import { Router } from "express";
import { pool } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/health", async (req, res) => {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - start;

    res.json({
      ok: true,
      status: "healthy",
      database: {
        connected: true,
        latency_ms: latencyMs,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      ok: false,
      status: "degraded",
      database: {
        connected: false,
        error: errorMsg,
      },
    });
  }
});
