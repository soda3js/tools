import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestServer } from "../../src/server.js";

const FIXTURES_DIR = resolve(__dirname, "../fixtures/sample-dataset");

describe("auth mode", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
			auth: { required: true, token: "secret-token" },
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("rejects requests without a valid token", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`);
		expect(res.status).toBe(401);
		const data = (await res.json()) as { code: string };
		expect(data.code).toBe("authentication_required");
	});

	it("rejects requests with a wrong token", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`, {
			headers: { "x-app-token": "wrong-token" },
		});
		expect(res.status).toBe(401);
	});

	it("allows requests with the correct token", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`, {
			headers: { "x-app-token": "secret-token" },
		});
		expect(res.status).toBe(200);
	});
});

describe("fault injection", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
			faults: [{ match: "/resource/test-1234.json", status: 503 }],
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("returns injected fault status", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`);
		expect(res.status).toBe(503);
		const data = (await res.json()) as { error: boolean; message: string };
		expect(data.error).toBe(true);
		expect(data.message).toContain("503");
	});
});

describe("chaos mode", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "chaos",
			chaos: {
				enabled: true,
				probability: 1.0,
				seed: 42,
				faults: [{ status: 429, weight: 1 }],
			},
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("returns chaos fault when probability is 1.0", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`);
		expect(res.status).toBe(429);
		const data = (await res.json()) as { error: boolean };
		expect(data.error).toBe(true);
	});
});

describe("requestCount tracking", () => {
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

	it("tracks request count across multiple requests", async () => {
		expect(server.requestCount).toBe(0);
		await fetch(`${server.url}/resource/test-1234.json`);
		expect(server.requestCount).toBe(1);
		await fetch(`${server.url}/resource/test-1234.json`);
		expect(server.requestCount).toBe(2);
	});
});

describe("POST body parsing", () => {
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

	it("parses JSON POST bodies for fixture matching", async () => {
		const res = await fetch(`${server.url}/api/v3/views/test-1234/query.json`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				$select: "*",
				page: { pageNumber: 1, pageSize: 2 },
			}),
		});
		expect(res.status).toBe(200);
	});

	it("handles PUT requests with body", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ id: "1" }),
		});
		// No fixture for PUT — expect 404
		expect(res.status).toBe(404);
	});
});

describe("record mode without app token", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "record",
			record: {
				portal: "example.com",
				fixtures: FIXTURES_DIR,
				overwrite: false,
			},
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("returns 500 when SOCRATA_APP_TOKEN is missing on cache miss", async () => {
		const originalToken = process.env.SOCRATA_APP_TOKEN;
		delete process.env.SOCRATA_APP_TOKEN;
		try {
			const res = await fetch(`${server.url}/resource/nonexistent-0000.json`);
			expect(res.status).toBe(500);
			const data = (await res.json()) as { message: string };
			expect(data.message).toContain("SOCRATA_APP_TOKEN");
		} finally {
			if (originalToken) process.env.SOCRATA_APP_TOKEN = originalToken;
		}
	});

	it("replays existing fixtures even in record mode", async () => {
		const res = await fetch(`${server.url}/resource/test-1234.json`);
		expect(res.status).toBe(200);
	});
});
