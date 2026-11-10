import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

async function startServer() {
  let dbTarget = "PostgreSQL";
  try {
    const parsed = new URL(env.DATABASE_URL);
    dbTarget = `${parsed.username ? parsed.username + "@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    dbTarget = env.DATABASE_URL;
  }

  // Gracefully probe PostgreSQL connection on startup
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const latency = Date.now() - start;
    console.log(
      `[DB] Connected to ${dbTarget} successfully (${latency}ms latency)`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `\n=======================================================\n` +
        `[DB] WARNING: Could not connect to ${dbTarget}\n` +
        `Error: ${errorMsg}\n\n` +
        `Possible causes:\n` +
        ` 1. Database does not exist yet (create it with: CREATE DATABASE internal_management;)\n` +
        ` 2. Password or username in .env is incorrect\n` +
        ` 3. PostgreSQL service is stopped\n` +
        `Server will continue running in offline/degraded mode.\n` +
        `=======================================================\n`
    );
  }

  app.listen(env.API_PORT, () => {
    console.log(`API listening on port ${env.API_PORT}`);
  });
}

void startServer();
