import { describe, expect, it } from "vitest";
import type { Config } from "../../src/lib/config-store.js";
import { DomainResolutionError, resolveDomain } from "../../src/lib/domain.js";

const testConfig: Config = {
	default_profile: "nyc",
	profiles: {
		nyc: { domain: "data.cityofnewyork.us", token: "nyc-token" },
		sf: { domain: "data.sfgov.org" },
	},
};

describe("resolveDomain", () => {
	it("resolves --profile flag with token", () => {
		const result = resolveDomain(testConfig, { profile: "nyc" });
		expect(result).toEqual({ domain: "data.cityofnewyork.us", appToken: "nyc-token" });
	});

	it("resolves --profile flag without token", () => {
		const result = resolveDomain(testConfig, { profile: "sf" });
		expect(result).toEqual({ domain: "data.sfgov.org" });
	});

	it("throws for unknown profile", () => {
		expect(() => resolveDomain(testConfig, { profile: "unknown" })).toThrow(DomainResolutionError);
		expect(() => resolveDomain(testConfig, { profile: "unknown" })).toThrow('Profile "unknown" not found');
	});

	it("resolves --domain flag (no token, SODA2 mode)", () => {
		const result = resolveDomain(testConfig, { domain: "data.example.com" });
		expect(result).toEqual({ domain: "data.example.com" });
		expect(result.appToken).toBeUndefined();
	});

	it("--profile takes priority over --domain", () => {
		const result = resolveDomain(testConfig, { profile: "nyc", domain: "other.com" });
		expect(result.domain).toBe("data.cityofnewyork.us");
	});

	it("falls back to default_profile", () => {
		const result = resolveDomain(testConfig, {});
		expect(result).toEqual({ domain: "data.cityofnewyork.us", appToken: "nyc-token" });
	});

	it("throws when default_profile references missing profile", () => {
		const config: Config = { default_profile: "gone", profiles: {} };
		expect(() => resolveDomain(config, {})).toThrow('Default profile "gone" not found');
	});

	it("throws when no resolution is possible", () => {
		const config: Config = { profiles: {} };
		expect(() => resolveDomain(config, {})).toThrow("No domain could be resolved");
	});
});
