import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { CacheEntryMetaSchema, DatasetFreshnessSchema } from "../../src/schemas/cache.js";
import { ConfigSchema, ProfileSchema } from "../../src/schemas/config.js";

describe("ProfileSchema", () => {
	const decode = Schema.decodeUnknownSync(ProfileSchema);

	it("accepts valid profile", () => {
		const result = decode({ domain: "data.sfgov.org" });
		expect(result.domain).toBe("data.sfgov.org");
	});

	it("accepts profile with token and cache", () => {
		const result = decode({
			domain: "data.sfgov.org",
			token: "abc123",
			cache: { enabled: true, ttl: 3600 },
		});
		expect(result.token).toBe("abc123");
		expect(result.cache?.enabled).toBe(true);
	});

	it("rejects profile missing domain", () => {
		expect(() => decode({ token: "abc" })).toThrow();
	});

	it("rejects non-string domain", () => {
		expect(() => decode({ domain: 123 })).toThrow();
	});
});

describe("ConfigSchema", () => {
	const decode = Schema.decodeUnknownSync(ConfigSchema);

	it("accepts valid config", () => {
		const result = decode({
			format: "table",
			default_profile: "nyc",
			profiles: {
				nyc: { domain: "data.cityofnewyork.us" },
				sf: { domain: "data.sfgov.org", token: "xyz" },
			},
		});
		expect(result.default_profile).toBe("nyc");
		expect(Object.keys(result.profiles)).toHaveLength(2);
	});

	it("accepts empty profiles", () => {
		const result = decode({ profiles: {} });
		expect(Object.keys(result.profiles)).toHaveLength(0);
	});

	it("rejects profile with invalid shape", () => {
		expect(() => decode({ profiles: { bad: { name: "wrong" } } })).toThrow();
	});
});

describe("CacheEntryMetaSchema", () => {
	const decode = Schema.decodeUnknownSync(CacheEntryMetaSchema);

	it("accepts valid cache entry metadata", () => {
		const result = decode({
			key: "abc123",
			path: "data.sfgov.org/yitu-d5am/queries/abc123.json",
			contentType: "application/json",
			created: "2026-04-07T20:47:34.505Z",
			datasetId: "yitu-d5am",
			domain: "data.sfgov.org",
			rowsUpdatedAt: 1771634692,
			sizeBytes: 1917,
			ttl: 300,
			cleanable: true,
			query: "$limit=3",
		});
		expect(result.key).toBe("abc123");
		expect(result.query).toBe("$limit=3");
	});

	it("accepts entry without optional query", () => {
		const result = decode({
			key: "abc123",
			path: "path.json",
			contentType: "application/json",
			created: "2026-04-07T00:00:00Z",
			datasetId: "test-1234",
			domain: "example.com",
			rowsUpdatedAt: 0,
			sizeBytes: 0,
			ttl: 300,
			cleanable: false,
		});
		expect(result.query).toBeUndefined();
	});
});

describe("DatasetFreshnessSchema", () => {
	const decode = Schema.decodeUnknownSync(DatasetFreshnessSchema);

	it("accepts valid freshness record", () => {
		const result = decode({
			domain: "data.sfgov.org",
			datasetId: "yitu-d5am",
			rowsUpdatedAt: 1771634692,
			lastChecked: "2026-04-08T00:33:42.879Z",
			ttl: 300,
		});
		expect(result.domain).toBe("data.sfgov.org");
		expect(result.ttl).toBe(300);
	});
});
