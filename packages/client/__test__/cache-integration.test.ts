import { MemoryCache } from "@soda3js/cache";
import type { DatasetFreshness } from "@soda3js/protocol";
import { describe, expect, it, vi } from "vitest";
import { FRESHNESS_KEY_PREFIX, cachedMetadata, cachedQuery, getFreshness, setFreshness } from "../src/utils/cache.js";

function makeRows(n: number): ReadonlyArray<Record<string, unknown>> {
	return Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Row ${i}` }));
}

describe("cache wrapper", () => {
	describe("freshness store", () => {
		it("returns undefined when no freshness is stored", async () => {
			const cache = new MemoryCache();
			const result = await getFreshness(cache, "test.example.com", "test-1234");
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
			await setFreshness(cache, freshness);
			const result = await getFreshness(cache, "test.example.com", "test-1234");
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
			await setFreshness(cache, freshness);
			const key = `${FRESHNESS_KEY_PREFIX}test.example.com/test-1234`;
			expect(await cache.has(key)).toBe(true);
		});
	});

	describe("cachedQuery", () => {
		it("calls fetcher on cold cache and caches the result", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn().mockResolvedValue(rows);

			const result = await cachedQuery({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT * LIMIT 3",
				format: "json",
				fetchMetadata: vi.fn().mockResolvedValue({ rowsUpdatedAt: 1000 }),
				fetchData: fetcher,
			});

			expect(result).toEqual(rows);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("serves from cache on warm hit within TTL", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn().mockResolvedValue(rows);
			const metaFetcher = vi.fn().mockResolvedValue({ rowsUpdatedAt: 1000 });

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

			await cachedQuery(opts);
			const result = await cachedQuery(opts);

			expect(result).toEqual(rows);
			expect(fetcher).toHaveBeenCalledOnce();
			expect(metaFetcher).toHaveBeenCalledOnce();
		});

		it("re-fetches metadata after TTL expires but serves cached data if unchanged", async () => {
			const cache = new MemoryCache();
			const rows = makeRows(3);
			const fetcher = vi.fn().mockResolvedValue(rows);
			const metaFetcher = vi.fn().mockResolvedValue({ rowsUpdatedAt: 1000 });

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

			await cachedQuery(opts);
			const result = await cachedQuery(opts);

			expect(result).toEqual(rows);
			expect(metaFetcher).toHaveBeenCalledTimes(2);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("re-fetches data when rowsUpdatedAt changes", async () => {
			const cache = new MemoryCache();
			const rows1 = makeRows(3);
			const rows2 = makeRows(5);
			const fetcher = vi.fn().mockResolvedValueOnce(rows1).mockResolvedValueOnce(rows2);
			let updatedAt = 1000;
			const metaFetcher = vi.fn().mockImplementation(() => Promise.resolve({ rowsUpdatedAt: updatedAt }));

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

			await cachedQuery(opts);
			updatedAt = 2000;
			const result = await cachedQuery(opts);

			expect(result).toEqual(rows2);
			expect(fetcher).toHaveBeenCalledTimes(2);
		});

		it("caches pages separately with pageNumber", async () => {
			const cache = new MemoryCache();
			const page1 = makeRows(2);
			const page2 = makeRows(3);
			const metaFetcher = vi.fn().mockResolvedValue({ rowsUpdatedAt: 1000 });
			const fetcher1 = vi.fn().mockResolvedValue(page1);
			const fetcher2 = vi.fn().mockResolvedValue(page2);

			await cachedQuery({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT *",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: fetcher1,
				pageNumber: 1,
			});

			await cachedQuery({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT *",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: fetcher2,
				pageNumber: 2,
			});

			// Re-fetch both pages — should serve from cache
			const r1 = await cachedQuery({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT *",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: vi.fn(),
				pageNumber: 1,
			});
			const r2 = await cachedQuery({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				query: "SELECT *",
				format: "json",
				fetchMetadata: metaFetcher,
				fetchData: vi.fn(),
				pageNumber: 2,
			});

			expect(r1).toEqual(page1);
			expect(r2).toEqual(page2);
		});
	});

	describe("cachedMetadata", () => {
		it("fetches and caches metadata", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn().mockResolvedValue(meta);

			const result = await cachedMetadata({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				fetchMetadata: fetcher,
			});

			expect(result).toEqual(meta);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("serves cached metadata within TTL", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn().mockResolvedValue(meta);

			const opts = {
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				fetchMetadata: fetcher,
			};

			await cachedMetadata(opts);
			const result = await cachedMetadata(opts);

			expect(result).toEqual(meta);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it("updates freshness store as side effect", async () => {
			const cache = new MemoryCache();
			const meta = { id: "test-1234", name: "Test", rowsUpdatedAt: 1000 };
			const fetcher = vi.fn().mockResolvedValue(meta);

			await cachedMetadata({
				cache,
				ttl: 300,
				domain: "test.example.com",
				datasetId: "test-1234",
				fetchMetadata: fetcher,
			});

			const freshness = await getFreshness(cache, "test.example.com", "test-1234");
			expect(freshness).toBeDefined();
			expect(freshness?.rowsUpdatedAt).toBe(1000);
		});
	});
});
