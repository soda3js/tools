import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestServer } from "../../src/server.js";

const FIXTURES_DIR = resolve(__dirname, "../fixtures/sample-dataset");

describe("replay mode", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("replays a GET request for a dataset resource", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("application/json");
		const data = await res.json();
		expect(data).toEqual([
			{ id: "1", name: "Test Row 1" },
			{ id: "2", name: "Test Row 2" },
		]);
	});

	it("replays a POST request with correct body hash", async () => {
		const res = await fetch(`${server.url}/api/v3/views/test-1234/query.json`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				$select: "*",
				page: { pageNumber: 1, pageSize: 2 },
			}),
		});
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toHaveLength(2);
	});

	it("replays CSV export responses", async () => {
		const res = await fetch(`${server.url}/api/views/test-1234/rows.csv`);
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("id,name");
	});

	it("returns 404 for unmatched requests", async () => {
		const res = await fetch(`${server.url}/resource/unknown-9999.json`);
		expect(res.status).toBe(404);
	});

	it("supports pagination - different pages return different bodies", async () => {
		const page1 = await fetch(`${server.url}/api/v3/views/test-1234/query.json`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				$select: "*",
				page: { pageNumber: 1, pageSize: 2 },
			}),
		});
		const page2 = await fetch(`${server.url}/api/v3/views/test-1234/query.json`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				$select: "*",
				page: { pageNumber: 2, pageSize: 2 },
			}),
		});
		const data1 = await page1.json();
		const data2 = await page2.json();
		expect(data1).toHaveLength(2);
		expect(data2).toHaveLength(0);
	});
});
