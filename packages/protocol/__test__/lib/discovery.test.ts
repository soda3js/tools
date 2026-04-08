import { describe, expect, it } from "vitest";
import { isCatalogResponseShape, isDiscoveryResultShape } from "../../src/index.js";

const validResult = {
	resource: {
		id: "yitu-d5am",
		name: "Film Locations in San Francisco",
		description: "A dataset of film locations",
		type: "dataset",
		updatedAt: "2026-01-15T00:00:00.000Z",
		columnsFieldName: ["title", "locations", "release_year"],
		columnsDataType: ["text", "text", "number"],
	},
	classification: {
		categories: ["Culture & Recreation"],
		tags: ["film", "movies"],
		domain_category: "Culture & Recreation",
		domain_tags: ["film"],
	},
	metadata: { domain: "data.sfgov.org" },
	permalink: "https://data.sfgov.org/d/yitu-d5am",
};

describe("isDiscoveryResultShape", () => {
	it("accepts valid discovery result", () => {
		expect(isDiscoveryResultShape(validResult)).toBe(true);
	});

	it("rejects missing resource.id", () => {
		const invalid = { ...validResult, resource: { ...validResult.resource, id: undefined } };
		expect(isDiscoveryResultShape(invalid)).toBe(false);
	});

	it("rejects non-object", () => {
		expect(isDiscoveryResultShape(null)).toBe(false);
		expect(isDiscoveryResultShape("string")).toBe(false);
	});
});

describe("isCatalogResponseShape", () => {
	it("accepts valid catalog response", () => {
		const response = {
			results: [validResult],
			resultSetSize: 1,
			timings: { serviceMillis: 50, searchMillis: [10] },
		};
		expect(isCatalogResponseShape(response)).toBe(true);
	});

	it("rejects missing results array", () => {
		expect(isCatalogResponseShape({ resultSetSize: 0 })).toBe(false);
	});
});
