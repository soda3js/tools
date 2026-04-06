import type { CacheEntry } from "@soda3js/protocol";
import { describe, expect, it } from "vitest";
import { MemoryCache } from "../../src/lib/memory-cache.js";

function makeEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
	return {
		body: new Uint8Array([1, 2, 3]),
		contentType: "application/json",
		headers: { "x-soda2-fields": '["id"]' },
		created: "2026-04-05T00:00:00.000Z",
		datasetId: "test-1234",
		domain: "test.example.com",
		rowsUpdatedAt: 1712345678,
		sizeBytes: 3,
		ttl: 300,
		cleanable: true,
		...overrides,
	};
}

describe("MemoryCache", () => {
	it("returns undefined for missing keys", async () => {
		const cache = new MemoryCache();
		expect(await cache.get("nonexistent")).toBeUndefined();
	});

	it("stores and retrieves entries", async () => {
		const cache = new MemoryCache();
		const entry = makeEntry();
		await cache.set("key1", entry);
		const result = await cache.get("key1");
		expect(result).toEqual(entry);
	});

	it("reports existence with has()", async () => {
		const cache = new MemoryCache();
		expect(await cache.has("key1")).toBe(false);
		await cache.set("key1", makeEntry());
		expect(await cache.has("key1")).toBe(true);
	});

	it("invalidates a single entry", async () => {
		const cache = new MemoryCache();
		await cache.set("key1", makeEntry());
		const removed = await cache.invalidate("key1");
		expect(removed).toBe(true);
		expect(await cache.has("key1")).toBe(false);
	});

	it("returns false when invalidating a missing key", async () => {
		const cache = new MemoryCache();
		expect(await cache.invalidate("nonexistent")).toBe(false);
	});

	it("overwrites existing entries on set()", async () => {
		const cache = new MemoryCache();
		await cache.set("key1", makeEntry({ sizeBytes: 10 }));
		await cache.set("key1", makeEntry({ sizeBytes: 20 }));
		const result = await cache.get("key1");
		expect(result?.sizeBytes).toBe(20);
	});

	it("evicts oldest entries when maxEntries is exceeded", async () => {
		const cache = new MemoryCache({ maxEntries: 2 });
		await cache.set("key1", makeEntry({ created: "2026-01-01T00:00:00.000Z" }));
		await cache.set("key2", makeEntry({ created: "2026-01-02T00:00:00.000Z" }));
		await cache.set("key3", makeEntry({ created: "2026-01-03T00:00:00.000Z" }));
		expect(await cache.has("key1")).toBe(false);
		expect(await cache.has("key2")).toBe(true);
		expect(await cache.has("key3")).toBe(true);
	});

	it("prunes cleanable entries older than maxAge", async () => {
		const cache = new MemoryCache();
		const old = "2020-01-01T00:00:00.000Z";
		const recent = new Date().toISOString();
		await cache.set("old", makeEntry({ created: old, cleanable: true, sizeBytes: 100 }));
		await cache.set("recent", makeEntry({ created: recent, cleanable: true, sizeBytes: 50 }));
		const result = await cache.prune({ maxAge: 60 });
		expect(result.removed).toBe(1);
		expect(result.freedBytes).toBe(100);
		expect(await cache.has("old")).toBe(false);
		expect(await cache.has("recent")).toBe(true);
	});

	it("prune respects cleanableOnly flag", async () => {
		const cache = new MemoryCache();
		const old = "2020-01-01T00:00:00.000Z";
		await cache.set("pinned", makeEntry({ created: old, cleanable: false }));
		await cache.set("cleanable", makeEntry({ created: old, cleanable: true }));
		const result = await cache.prune({ maxAge: 60, cleanableOnly: true });
		expect(result.removed).toBe(1);
		expect(await cache.has("pinned")).toBe(true);
		expect(await cache.has("cleanable")).toBe(false);
	});

	it("clear() removes all entries", async () => {
		const cache = new MemoryCache();
		await cache.set("key1", makeEntry());
		await cache.set("key2", makeEntry());
		cache.clear();
		expect(await cache.has("key1")).toBe(false);
		expect(await cache.has("key2")).toBe(false);
	});
});
