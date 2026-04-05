import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../../src/lib/fixture-loader.js";

const FIXTURES_DIR = resolve(__dirname, "../fixtures/sample-dataset");

describe("loadFixtures", () => {
	it("loads all envelope files from a fixture directory", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		expect(index.entries.size).toBeGreaterThanOrEqual(5);
	});

	it("indexes GET requests by method + path", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		const key = "GET:/resource/test-1234.json";
		expect(index.pathEntries.has(key)).toBe(true);
		const fixture = index.pathEntries.get(key);
		expect(fixture).toBeDefined();
		expect(fixture?.envelope.dataset_id).toBe("test-1234");
		expect(fixture?.envelope.response.status).toBe(200);
	});

	it("indexes POST requests by method + path + body hash", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		const pathKey = "POST:/api/v3/views/test-1234/query.json";
		expect(index.pathEntries.has(pathKey)).toBe(true);
		const exactKeys = [...index.entries.keys()].filter((k) => k.startsWith("POST:/api/v3/views/test-1234/query.json:"));
		expect(exactKeys.length).toBe(3);
	});

	it("resolves body file paths relative to the envelope", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		const key = "GET:/resource/test-1234.json";
		const fixture = index.pathEntries.get(key);
		expect(fixture).toBeDefined();
		expect(fixture?.bodyPath).toContain("GET--resource--test-1234.body.json");
	});

	it("handles CSV body files", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		const key = "GET:/api/views/test-1234/rows.csv";
		const fixture = index.pathEntries.get(key);
		expect(fixture).toBeDefined();
		expect(fixture?.envelope.response.content_type).toBe("text/csv");
		expect(fixture?.bodyPath).toContain(".body.csv");
	});

	it("loads error response fixtures", async () => {
		const index = await loadFixtures(FIXTURES_DIR);
		const pathKey = "POST:/api/v3/views/test-1234/query.json";
		expect(index.pathEntries.has(pathKey)).toBe(true);
	});

	it("returns empty index for nonexistent directory", async () => {
		const index = await loadFixtures("/nonexistent/path");
		expect(index.entries.size).toBe(0);
		expect(index.pathEntries.size).toBe(0);
	});
});
