import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestServer } from "../../src/server.js";

const FIXTURES_DIR = resolve(__dirname, "../fixtures/sample-dataset");

describe("ServerPlugin integration", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
		});
		process.env.SODA3_TEST_SERVER = server.url;
	});

	afterAll(async () => {
		delete process.env.SODA3_TEST_SERVER;
		await server.close();
	});

	it("env var SODA3_TEST_SERVER is set to server URL", () => {
		expect(process.env.SODA3_TEST_SERVER).toMatch(/^http:\/\/localhost:\d+$/);
	});

	it("server is accessible via the env var URL", async () => {
		const url = process.env.SODA3_TEST_SERVER;
		expect(url).toBeDefined();
		const res = await fetch(`${url}/resource/test-1234.json`);
		expect(res.status).toBe(200);
	});

	it("server responds with correct fixture data", async () => {
		const url = process.env.SODA3_TEST_SERVER;
		expect(url).toBeDefined();
		const res = await fetch(`${url}/resource/test-1234.json`);
		const data = await res.json();
		expect(data).toEqual([
			{ id: "1", name: "Test Row 1" },
			{ id: "2", name: "Test Row 2" },
		]);
	});
});
