import { describe, expect, it } from "vitest";
import { buildCacheKey } from "../../src/lib/cache-key.js";

describe("buildCacheKey", () => {
	it("returns a path-like key with domain/dataset/hash", async () => {
		const key = await buildCacheKey({
			domain: "data.cityofnewyork.us",
			datasetId: "ydr8-5enu",
			query: "SELECT * LIMIT 10",
		});
		expect(key).toMatch(/^data\.cityofnewyork\.us\/ydr8-5enu\/[a-f0-9]{16}$/);
	});

	it("produces identical keys for identical inputs", async () => {
		const input = {
			domain: "data.cityofnewyork.us",
			datasetId: "ydr8-5enu",
			query: "SELECT * LIMIT 10",
		};
		const key1 = await buildCacheKey(input);
		const key2 = await buildCacheKey(input);
		expect(key1).toBe(key2);
	});

	it("produces different keys for different queries", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu" };
		const key1 = await buildCacheKey({ ...base, query: "SELECT * LIMIT 10" });
		const key2 = await buildCacheKey({ ...base, query: "SELECT * LIMIT 20" });
		expect(key1).not.toBe(key2);
	});

	it("produces different keys for different domains", async () => {
		const base = { datasetId: "ydr8-5enu", query: "SELECT *" };
		const key1 = await buildCacheKey({ ...base, domain: "data.cityofnewyork.us" });
		const key2 = await buildCacheKey({ ...base, domain: "data.cityofchicago.org" });
		expect(key1).not.toBe(key2);
	});

	it("produces different keys for different datasets", async () => {
		const base = { domain: "data.cityofnewyork.us", query: "SELECT *" };
		const key1 = await buildCacheKey({ ...base, datasetId: "ydr8-5enu" });
		const key2 = await buildCacheKey({ ...base, datasetId: "abcd-1234" });
		expect(key1).not.toBe(key2);
	});

	it("includes format in the key when provided", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu", query: "SELECT *" };
		const key1 = await buildCacheKey({ ...base, format: "json" });
		const key2 = await buildCacheKey({ ...base, format: "csv" });
		expect(key1).not.toBe(key2);
	});

	it("defaults format to json when omitted", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu", query: "SELECT *" };
		const key1 = await buildCacheKey(base);
		const key2 = await buildCacheKey({ ...base, format: "json" });
		expect(key1).toBe(key2);
	});

	it("includes rowsUpdatedAt in the key when provided", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu", query: "SELECT *" };
		const key1 = await buildCacheKey({ ...base, rowsUpdatedAt: 1712345678 });
		const key2 = await buildCacheKey({ ...base, rowsUpdatedAt: 1712345999 });
		expect(key1).not.toBe(key2);
	});

	it("excludes rowsUpdatedAt from key when omitted", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu", query: "SELECT *" };
		const keyWithout = await buildCacheKey(base);
		const keyWith = await buildCacheKey({ ...base, rowsUpdatedAt: 1712345678 });
		expect(keyWithout).not.toBe(keyWith);
	});

	it("prevents concatenation collisions via null byte separator", async () => {
		const base = { domain: "data.cityofnewyork.us", datasetId: "ydr8-5enu" };
		const key1 = await buildCacheKey({ ...base, query: "SELECT * LIMIT 1" });
		const key2 = await buildCacheKey({ ...base, query: "SELECT * LIMIT 10" });
		expect(key1).not.toBe(key2);
	});
});
