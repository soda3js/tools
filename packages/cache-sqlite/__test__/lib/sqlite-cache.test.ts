import type { SqlClient } from "@effect/sql";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { CacheEntry } from "@soda3js/protocol";
import type { Effect } from "effect";
import { ManagedRuntime } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import migration from "../../src/lib/migrations/0001-initial.js";
import { SqliteCacheImpl } from "../../src/lib/sqlite-cache.js";

function makeEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
	return {
		body: new Uint8Array([1, 2, 3]),
		contentType: "application/json",
		headers: { "content-type": "application/json" },
		created: new Date().toISOString(),
		datasetId: "test-1234",
		domain: "test.example.com",
		rowsUpdatedAt: 1712345678,
		sizeBytes: 3,
		ttl: 300,
		cleanable: true,
		...overrides,
	};
}

const TestSqlLayer = SqliteClient.layer({ filename: ":memory:" });

describe("SqliteCacheImpl", () => {
	let cache: SqliteCacheImpl;
	// biome-ignore lint/suspicious/noExplicitAny: runtime type varies by platform layer
	let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, any>;

	beforeAll(async () => {
		runtime = ManagedRuntime.make(TestSqlLayer);
		const runSql = <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>): Promise<A> =>
			runtime.runPromise(effect as Effect.Effect<A, never, SqlClient.SqlClient>);

		// Run migration to create tables
		await runSql(migration);
		cache = new SqliteCacheImpl(runSql);
	});

	afterAll(async () => {
		await runtime.dispose();
	});

	it("returns undefined for missing keys", async () => {
		expect(await cache.get("nonexistent")).toBeUndefined();
	});

	it("stores and retrieves entries", async () => {
		await cache.set("key1", makeEntry());
		const result = await cache.get("key1");
		expect(result).toBeDefined();
		expect(result?.datasetId).toBe("test-1234");
		expect(result?.sizeBytes).toBe(3);
		expect(result?.contentType).toBe("application/json");
		expect(result?.domain).toBe("test.example.com");
	});

	it("preserves Uint8Array body through round-trip", async () => {
		const body = new Uint8Array([10, 20, 30, 40, 50]);
		await cache.set("body-test", makeEntry({ body, sizeBytes: 5 }));
		const result = await cache.get("body-test");
		expect(result).toBeDefined();
		expect(new Uint8Array(result!.body)).toEqual(body);
	});

	it("preserves headers through round-trip", async () => {
		const headers = { "content-type": "text/csv", "x-custom": "value" };
		await cache.set("header-test", makeEntry({ headers }));
		const result = await cache.get("header-test");
		expect(result).toBeDefined();
		expect(result?.headers).toEqual(headers);
	});

	it("has() reports existence correctly", async () => {
		expect(await cache.has("has-test")).toBe(false);
		await cache.set("has-test", makeEntry());
		expect(await cache.has("has-test")).toBe(true);
	});

	it("invalidate() removes entry and returns true", async () => {
		await cache.set("inv-test", makeEntry());
		expect(await cache.invalidate("inv-test")).toBe(true);
		expect(await cache.has("inv-test")).toBe(false);
	});

	it("invalidate() returns false for missing key", async () => {
		expect(await cache.invalidate("missing-key")).toBe(false);
	});

	it("prune() removes old cleanable entries", async () => {
		await cache.set("old", makeEntry({ created: "2020-01-01T00:00:00.000Z", cleanable: true, sizeBytes: 100 }));
		await cache.set("recent", makeEntry({ created: new Date().toISOString(), cleanable: true, sizeBytes: 50 }));
		const result = await cache.prune({ maxAge: 60 });
		expect(result.removed).toBe(1);
		expect(result.freedBytes).toBe(100);
		expect(await cache.has("old")).toBe(false);
		expect(await cache.has("recent")).toBe(true);
	});

	it("prune() respects cleanableOnly flag", async () => {
		await cache.set("pinned", makeEntry({ created: "2020-01-01T00:00:00.000Z", cleanable: false, sizeBytes: 200 }));
		await cache.set(
			"cleanable-old",
			makeEntry({ created: "2020-01-01T00:00:00.000Z", cleanable: true, sizeBytes: 150 }),
		);
		const result = await cache.prune({ maxAge: 60, cleanableOnly: true });
		expect(result.removed).toBe(1);
		expect(result.freedBytes).toBe(150);
		expect(await cache.has("pinned")).toBe(true);
		expect(await cache.has("cleanable-old")).toBe(false);
	});

	it("prune() returns zero counts when no options provided", async () => {
		const result = await cache.prune();
		expect(result.removed).toBe(0);
		expect(result.freedBytes).toBe(0);
	});

	it("prune() returns zero counts when no rows match the cutoff", async () => {
		// Use cleanableOnly with only a non-cleanable old entry present so no rows match
		await cache.set(
			"no-match-pinned",
			makeEntry({ created: "2020-01-01T00:00:00.000Z", cleanable: false, sizeBytes: 5 }),
		);
		// cleanableOnly: true means only cleanable rows are selected — pinned won't match
		const result = await cache.prune({ maxAge: 60, cleanableOnly: true });
		expect(result.removed).toBe(0);
		expect(result.freedBytes).toBe(0);
		expect(await cache.has("no-match-pinned")).toBe(true);
	});
});
