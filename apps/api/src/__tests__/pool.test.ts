import { describe, it, expect, vi, afterEach } from "vitest";
import { pool, query, withTransaction } from "../db/pool.js";

describe("Phase 1: Database Pool & Transaction Helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes SQL text and parameter array to pool.query", async () => {
    const mockResult = { rows: [{ country_id: "1" }], rowCount: 1 };
    const spy = vi
      .spyOn(pool, "query")
      .mockResolvedValueOnce(mockResult as never);

    const res = await query("SELECT * FROM countries WHERE country_id = $1", [
      "1",
    ]);

    expect(spy).toHaveBeenCalledWith(
      "SELECT * FROM countries WHERE country_id = $1",
      ["1"]
    );
    expect(res.rows).toEqual([{ country_id: "1" }]);
  });

  it("commits transaction when callback succeeds", async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    const out = await withTransaction(async (tx) => {
      await tx.query("INSERT INTO countries (country_name, iso_code) VALUES ($1, $2)", [
        "Germany",
        "DE",
      ]);
      return "done";
    });

    expect(out).toBe("done");
    expect(clientQuery).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      "INSERT INTO countries (country_name, iso_code) VALUES ($1, $2)",
      ["Germany", "DE"]
    );
    expect(clientQuery).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back transaction and releases client when callback throws", async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = vi.fn();
    vi.spyOn(pool, "connect").mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    await expect(
      withTransaction(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(clientQuery).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(clientQuery).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});
