import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CacheEntry } from "@soda3js/protocol";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemCacheImpl } from "../../src/lib/fs-cache.js";

const TEST_CACHE = join(tmpdir(), "soda3-fscache-test-v2", "cache");

function makeEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
	return {
		body: new Uint8Array([1, 2, 3]),
		contentType: "application/json",
		headers: { "content-type": "application/json" },
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

beforeEach(async () => {
	await mkdir(TEST_CACHE, { recursive: true });
});

afterEach(async () => {
	await rm(join(tmpdir(), "soda3-fscache-test-v2"), { recursive: true, force: true });
});

describe("FileSystemCacheImpl (hierarchical)", () => {
	it("returns undefined for missing keys", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		expect(await cache.get("test.example.com/test-1234/nonexistent")).toBeUndefined();
	});

	it("stores and retrieves entries in domain/dataset/queries directory", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/abc123";
		await cache.set(key, makeEntry());
		const result = await cache.get(key);
		expect(result).toBeDefined();
		expect(result?.datasetId).toBe("test-1234");
	});

	it("creates hierarchical directory structure with queries/ subdir", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		await cache.set("test.example.com/test-1234/abc123", makeEntry());
		const domainDir = await readdir(join(TEST_CACHE, "test.example.com"));
		expect(domainDir).toContain("test-1234");
		const datasetDir = await readdir(join(TEST_CACHE, "test.example.com", "test-1234"));
		expect(datasetDir).toContain("queries");
		const queryDir = await readdir(join(TEST_CACHE, "test.example.com", "test-1234", "queries"));
		expect(queryDir.some((f) => f.startsWith("abc123"))).toBe(true);
	});

	it("writes sidecar .meta.json alongside body file in queries/", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		await cache.set("test.example.com/test-1234/abc123", makeEntry({ query: "SELECT * LIMIT 5" }));
		const dir = join(TEST_CACHE, "test.example.com", "test-1234", "queries");
		const files = await readdir(dir);
		expect(files).toContain("abc123.json");
		expect(files).toContain("abc123.meta.json");
		const meta = JSON.parse(await readFile(join(dir, "abc123.meta.json"), "utf-8"));
		expect(meta.key).toBe("abc123");
		expect(meta.query).toBe("SELECT * LIMIT 5");
		expect(meta.path).toBe("test.example.com/test-1234/queries/abc123.json");
	});

	it("preserves body bytes through round-trip", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const body = new Uint8Array([10, 20, 30, 40, 50]);
		await cache.set("test.example.com/test-1234/abc123", makeEntry({ body, sizeBytes: 5 }));
		const result = await cache.get("test.example.com/test-1234/abc123");
		expect(result).toBeDefined();
		if (!result) throw new Error("unreachable");
		expect(new Uint8Array(result.body)).toEqual(body);
	});

	it("has() checks for sidecar file existence", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/abc123";
		expect(await cache.has(key)).toBe(false);
		await cache.set(key, makeEntry());
		expect(await cache.has(key)).toBe(true);
	});

	it("invalidate() removes body and sidecar files", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/abc123";
		await cache.set(key, makeEntry());
		expect(await cache.invalidate(key)).toBe(true);
		expect(await cache.has(key)).toBe(false);
	});

	it("invalidate() returns false for missing key", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		expect(await cache.invalidate("test.example.com/test-1234/nonexistent")).toBe(false);
	});

	it("prune() removes old cleanable entries", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		await cache.set(
			"test.example.com/test-1234/old",
			makeEntry({
				created: "2020-01-01T00:00:00.000Z",
				cleanable: true,
				sizeBytes: 100,
			}),
		);
		await cache.set(
			"test.example.com/test-1234/recent",
			makeEntry({
				created: new Date().toISOString(),
				cleanable: true,
				sizeBytes: 50,
			}),
		);
		const result = await cache.prune({ maxAge: 60 });
		expect(result.removed).toBe(1);
		expect(result.freedBytes).toBe(100);
		expect(await cache.has("test.example.com/test-1234/old")).toBe(false);
		expect(await cache.has("test.example.com/test-1234/recent")).toBe(true);
	});

	it("prune() respects cleanableOnly", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		await cache.set(
			"test.example.com/test-1234/pinned",
			makeEntry({
				created: "2020-01-01T00:00:00.000Z",
				cleanable: false,
			}),
		);
		await cache.set(
			"test.example.com/test-1234/cleanable",
			makeEntry({
				created: "2020-01-01T00:00:00.000Z",
				cleanable: true,
			}),
		);
		const result = await cache.prune({ maxAge: 60, cleanableOnly: true });
		expect(result.removed).toBe(1);
		expect(await cache.has("test.example.com/test-1234/pinned")).toBe(true);
	});

	it("prune() with maxAge 0 removes everything cleanable", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		await cache.set("test.example.com/test-1234/entry1", makeEntry({ sizeBytes: 100 }));
		await cache.set("test.example.com/test-1234/entry2", makeEntry({ sizeBytes: 200 }));
		const result = await cache.prune({ maxAge: 0 });
		expect(result.removed).toBe(2);
		expect(result.freedBytes).toBe(300);
	});
});

describe("FileSystemCacheImpl (freshness)", () => {
	it("stores freshness data as _freshness.json at dataset level", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "__freshness__/test.example.com/test-1234";
		const body = new TextEncoder().encode(
			JSON.stringify({ rowsUpdatedAt: 1712345678, lastChecked: "2026-04-05T00:00:00.000Z", ttl: 300 }),
		);
		await cache.set(key, makeEntry({ body, sizeBytes: body.length, cleanable: false }));

		const freshnessPath = join(TEST_CACHE, "test.example.com", "test-1234", "_freshness.json");
		const raw = await readFile(freshnessPath, "utf-8");
		const parsed = JSON.parse(raw);
		expect(parsed.rowsUpdatedAt).toBe(1712345678);
	});

	it("retrieves freshness data via get()", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "__freshness__/test.example.com/test-1234";
		const payload = { rowsUpdatedAt: 1712345678, lastChecked: "2026-04-05T00:00:00.000Z", ttl: 300 };
		const body = new TextEncoder().encode(JSON.stringify(payload));
		await cache.set(key, makeEntry({ body, sizeBytes: body.length, cleanable: false }));

		const result = await cache.get(key);
		expect(result).toBeDefined();
		if (!result) throw new Error("unreachable");
		const decoded = JSON.parse(new TextDecoder().decode(result.body));
		expect(decoded.rowsUpdatedAt).toBe(1712345678);
	});

	it("has() detects freshness entries", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "__freshness__/test.example.com/test-1234";
		expect(await cache.has(key)).toBe(false);
		const body = new TextEncoder().encode("{}");
		await cache.set(key, makeEntry({ body, sizeBytes: body.length }));
		expect(await cache.has(key)).toBe(true);
	});

	it("invalidate() removes freshness file", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "__freshness__/test.example.com/test-1234";
		const body = new TextEncoder().encode("{}");
		await cache.set(key, makeEntry({ body, sizeBytes: body.length }));
		expect(await cache.invalidate(key)).toBe(true);
		expect(await cache.has(key)).toBe(false);
	});

	it("prune() does not remove freshness files", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const freshnessKey = "__freshness__/test.example.com/test-1234";
		const body = new TextEncoder().encode("{}");
		await cache.set(freshnessKey, makeEntry({ body, sizeBytes: body.length }));
		await cache.set("test.example.com/test-1234/entry1", makeEntry({ sizeBytes: 100 }));

		const result = await cache.prune({ maxAge: 0 });
		expect(result.removed).toBe(1);
		expect(await cache.has(freshnessKey)).toBe(true);
	});
});

describe("FileSystemCacheImpl (metadata)", () => {
	it("stores metadata as _metadata.json at dataset level", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/somehash";
		const body = new TextEncoder().encode(JSON.stringify({ columns: [{ name: "id" }] }));
		await cache.set(key, makeEntry({ body, sizeBytes: body.length, query: "__metadata__" }));

		const metadataPath = join(TEST_CACHE, "test.example.com", "test-1234", "_metadata.json");
		const raw = await readFile(metadataPath, "utf-8");
		const parsed = JSON.parse(raw);
		expect(parsed.columns[0].name).toBe("id");
	});

	it("does not create sidecar for metadata entries", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/somehash";
		const body = new TextEncoder().encode("{}");
		await cache.set(key, makeEntry({ body, sizeBytes: body.length, query: "__metadata__" }));

		const datasetDir = join(TEST_CACHE, "test.example.com", "test-1234");
		const files = await readdir(datasetDir);
		expect(files).toContain("_metadata.json");
		expect(files).not.toContain("queries");
	});

	it("retrieves metadata via get() fallback", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const key = "test.example.com/test-1234/somehash";
		const payload = { columns: [{ name: "id" }] };
		const body = new TextEncoder().encode(JSON.stringify(payload));
		await cache.set(key, makeEntry({ body, sizeBytes: body.length, query: "__metadata__" }));

		const result = await cache.get(key);
		expect(result).toBeDefined();
		if (!result) throw new Error("unreachable");
		expect(result.query).toBe("__metadata__");
		const decoded = JSON.parse(new TextDecoder().decode(result.body));
		expect(decoded.columns[0].name).toBe("id");
	});

	it("prune() does not remove metadata files", async () => {
		const cache = new FileSystemCacheImpl({ cacheDir: TEST_CACHE });
		const metaKey = "test.example.com/test-1234/metahash";
		const body = new TextEncoder().encode("{}");
		await cache.set(metaKey, makeEntry({ body, sizeBytes: body.length, query: "__metadata__" }));
		await cache.set("test.example.com/test-1234/entry1", makeEntry({ sizeBytes: 100 }));

		const result = await cache.prune({ maxAge: 0 });
		expect(result.removed).toBe(1);

		// Metadata file should still exist
		const metadataPath = join(TEST_CACHE, "test.example.com", "test-1234", "_metadata.json");
		const raw = await readFile(metadataPath, "utf-8");
		expect(raw).toBe("{}");
	});
});
