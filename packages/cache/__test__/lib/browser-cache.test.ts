import "fake-indexeddb/auto";
import type { CacheEntry } from "@soda3js/protocol";
import { describe, expect, it } from "vitest";
import { BrowserCache } from "../../src/lib/browser-cache.js";

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

let dbCounter = 0;
function uniqueDbName(): string {
	dbCounter++;
	return `test-cache-${dbCounter}`;
}

describe("BrowserCache", () => {
	it("returns undefined for missing keys", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		expect(await cache.get("nonexistent")).toBeUndefined();
	});

	it("stores and retrieves entries", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		const entry = makeEntry();
		await cache.set("key1", entry);
		const result = await cache.get("key1");
		expect(result).toBeDefined();
		expect(result?.datasetId).toBe("test-1234");
		expect(result?.contentType).toBe("application/json");
		expect(result?.sizeBytes).toBe(3);
	});

	it("preserves Uint8Array body through round-trip", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		const body = new Uint8Array([10, 20, 30, 40]);
		await cache.set("key1", makeEntry({ body, sizeBytes: 4 }));
		const result = await cache.get("key1");
		expect(result).toBeDefined();
		if (!result) throw new Error("unreachable");
		expect(new Uint8Array(result.body)).toEqual(body);
	});

	it("reports existence with has()", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		expect(await cache.has("key1")).toBe(false);
		await cache.set("key1", makeEntry());
		expect(await cache.has("key1")).toBe(true);
	});

	it("invalidates a single entry", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		await cache.set("key1", makeEntry());
		const removed = await cache.invalidate("key1");
		expect(removed).toBe(true);
		expect(await cache.has("key1")).toBe(false);
	});

	it("returns false when invalidating a missing key", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		expect(await cache.invalidate("nonexistent")).toBe(false);
	});

	it("prunes cleanable entries older than maxAge", async () => {
		const cache = new BrowserCache({ dbName: uniqueDbName() });
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
		const cache = new BrowserCache({ dbName: uniqueDbName() });
		const old = "2020-01-01T00:00:00.000Z";
		await cache.set("pinned", makeEntry({ created: old, cleanable: false }));
		await cache.set("cleanable", makeEntry({ created: old, cleanable: true }));
		const result = await cache.prune({ maxAge: 60, cleanableOnly: true });
		expect(result.removed).toBe(1);
		expect(await cache.has("pinned")).toBe(true);
	});
});
