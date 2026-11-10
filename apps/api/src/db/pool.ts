import pg, { QueryResult, QueryResultRow } from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export interface DbClient {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ): Promise<QueryResult<R>>;
}

/**
 * Executes a parameterized SQL query against the PostgreSQL pool.
 * Per AGENTS.md: plain SQL via pg, parameterized only.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = []
): Promise<QueryResult<R>> {
  return pool.query<R>(text, params as unknown[]);
}

/**
 * Runs a callback inside a database transaction (BEGIN -> COMMIT / ROLLBACK).
 */
export async function withTransaction<T>(
  fn: (client: DbClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      query: <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params: readonly unknown[] = []
      ) => client.query<R>(text, params as unknown[]),
    });
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
