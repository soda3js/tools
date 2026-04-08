import { MemoryCache } from "@soda3js/cache";
import type { DatasetFreshness } from "@soda3js/protocol";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { FRESHNESS_KEY_PREFIX, cachedMetadata, cachedQuery, getFreshness, setFreshness } from "../src/utils/cache.js";

const run = Effect.runPromise;

function makeRows(n: number): ReadonlyArray<Record<string, unknown>> {
	return Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Row ${i}` }));
}

describe("cache wrapper", () => {
	describe("freshness store", () => {
		it("returns undefined when no freshness is stored", async () => {
			const cache = new MemoryCache();
			const result = await run(getFreshness(cache, "test.example.com", "test-1234"));
			expect(result).toBeUndefined();
		});

		it("stores and retrieves freshness", async () => {
			const cache = new MemoryCache();
			const freshness: DatasetFreshness = {
				domain: "test.example.com",
				datasetId: "test-1234",
				rowsUpdatedAt: 1000,
				lastChecked: new Date().toISOString(),
				ttl: 300,
			};
			await run(setFreshness(cache, freshness));
			const result = await run(getFreshness(cache, "test.example.com", "test-1234"));
			expect(result).toBeDefined();
			expect(result?.rowsUpdatedAt).toBe(1000);
		});

		it("uses reserved key prefix", async () => {
			const cache = new MemoryCache();
			const freshness: DatasetFreshness = {
				domain: "test.example.com",
				datasetId: "test-1234",
				rowsUpdatedAt: 1000,
				lastChecked: new Date().toISOString(),
				ttl: 300,
			};
			await run(setFreshness(cache, freshness));
			const key = `${FRESHNESS_KEY_PREFIX}test.example.com/test-1234`;
			expect(await cache.has(key)).toBe(true);
		});
	});

	describe("cachedQuery", () => {
		it("calls fetcher on cold cache and caches the result", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn(() => Effect.succeed(rows));

			const result = await run(
				cachedQuery({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					query: "SELECT * LIMIT 3",
					format: "json",
					fetchMetadata: () => Effect.succeed({ rowsUpdatedAt: 1000 }),
					fetchData: fetcher,
				}),
			);

			expect(result).toEqual(rows);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("serves from cache on warm hit within TTL", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn(() => Effect.succeed(rows));
			const metaFetcher = vi.fn(() => Effect.succeed({ rowsUpdatedAt: 1000 }));

			const opts = {
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT * LIMIT 3",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: fetcher,
			};

			await run(cachedQuery(opts));
			const result = await run(cachedQuery(opts));

			expect(result).toEqual(rows);
			expect(fetcher).toHaveBeenCalledOnce();
			expect(metaFetcher).toHaveBeenCalledOnce();
		});

		it("re-fetches metadata after TTL expires but serves cached data if unchanged", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn(() => Effect.succeed(rows));
			const metaFetcher = vi.fn(() => Effect.succeed({ rowsUpdatedAt: 1000 }));

			const opts = {
				cache,
				ttl: 0, // always expired
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT * LIMIT 3",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: fetcher,
			};

			await run(cachedQuery(opts));
			const result = await run(cachedQuery(opts));

			expect(result).toEqual(rows);
			expect(metaFetcher).toHaveBeenCalledTimes(2);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("re-fetches data when rowsUpdatedAt changes", async () => {
			const cache = new MemoryCache();
			const rows1 = makeRows(3);
			const rows2 = makeRows(5);
			const fetcher = vi.fn().mockReturnValueOnce(Effect.succeed(rows1)).mockReturnValueOnce(Effect.succeed(rows2));
			let updatedAt = 1000;
			const metaFetcher = vi.fn(() => Effect.succeed({ rowsUpdatedAt: updatedAt }));

			const opts = {
				cache,
				ttl: 0,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT * LIMIT 3",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: fetcher,
			};

			await run(cachedQuery(opts));
			updatedAt = 2000;
			const result = await run(cachedQuery(opts));

			expect(result).toEqual(rows2);
			expect(fetcher).toHaveBeenCalledTimes(2);
		});

		it("caches pages separately with pageNumber", async () => {
			const cache = new MemoryCache();
			const page1 = makeRows(2);
			const page2 = makeRows(3);
			const metaFetcher = vi.fn(() => Effect.succeed({ rowsUpdatedAt: 1000 }));

			await run(
				cachedQuery({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					query: "SELECT *",
					format: "json",
					fetchMetadata: metaFetcher,
					fetchData: () => Effect.succeed(page1),
					pageNumber: 1,
				}),
			);

			await run(
				cachedQuery({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					query: "SELECT *",
					format: "json",
					fetchMetadata: metaFetcher,
					fetchData: () => Effect.succeed(page2),
					pageNumber: 2,
				}),
			);

			const r1 = await run(
				cachedQuery({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					query: "SELECT *",
					format: "json",
					fetchMetadata: metaFetcher,
					fetchData: () => Effect.succeed([]),
					pageNumber: 1,
				}),
			);
			const r2 = await run(
				cachedQuery({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					query: "SELECT *",
					format: "json",
					fetchMetadata: metaFetcher,
					fetchData: () => Effect.succeed([]),
					pageNumber: 2,
				}),
			);

			expect(r1).toEqual(page1);
			expect(r2).toEqual(page2);
		});
	});

	describe("cachedMetadata", () => {
		it("fetches and caches metadata", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn(() => Effect.succeed(meta));

			const result = await run(
				cachedMetadata({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					fetchMetadata: fetcher,
				}),
			);

			expect(result).toEqual(meta);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("serves cached metadata within TTL", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn(() => Effect.succeed(meta));

			const opts = {
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				fetchMetadata: fetcher,
			};

			await run(cachedMetadata(opts));
			const result = await run(cachedMetadata(opts));

			expect(result).toEqual(meta);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("updates freshness store as side effect", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn(() => Effect.succeed(meta));

			await run(
				cachedMetadata({
					cache,
					ttl: 300,
					domain: "test.example.com",
					datasetId: "test-1234",
					fetchMetadata: fetcher,
				}),
			);

			const freshness = await run(getFreshness(cache, "test.example.com", "test-1234"));
			expect(freshness).toBeDefined();
			expect(freshness?.rowsUpdatedAt).toBe(1000);
		});
	});
});
