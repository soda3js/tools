import { rm } from "node:fs/promises";
import type { Server } from "node:http";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestServer } from "../../src/server.js";

const RECORD_DIR = join(tmpdir(), "soda3-record-test");

let upstream: Server;
let upstreamPort: number;

beforeAll(async () => {
	upstream = createServer((req, res) => {
		if (req.url?.includes("/resource/fake-1234.json")) {
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify([{ id: "upstream-1" }]));
		} else if (req.url?.includes("/api/views/fake-1234/rows.csv")) {
			res.writeHead(200, { "content-type": "text/csv" });
			res.end("id\nupstream-1");
		} else {
			res.writeHead(404);
			res.end("Not found");
		}
	});
	await new Promise<void>((resolve) => {
		upstream.listen(0, () => resolve());
	});
	const addr = upstream.address();
	upstreamPort = typeof addr === "object" && addr ? addr.port : 0;
});

afterAll(async () => {
	await new Promise<void>((resolve) => upstream.close(() => resolve()));
});

afterEach(async () => {
	await rm(RECORD_DIR, { recursive: true, force: true });
});

describe("record mode", () => {
	it("starts in record mode and handles requests", async () => {
		const originalToken = process.env.SOCRATA_APP_TOKEN;
		process.env.SOCRATA_APP_TOKEN = "test-token";

		const server = await TestServer.create({
			fixtures: RECORD_DIR,
			mode: "record",
			record: {
				portal: `localhost:${upstreamPort}`,
				fixtures: join(RECORD_DIR, "fake-dataset", "responses"),
				overwrite: false,
			},
		});

		try {
			// The server starts successfully
			expect(server.url).toMatch(/^http:\/\/localhost:\d+$/);

			// Requests to unknown fixtures will attempt to proxy (HTTPS)
			// which will fail against our HTTP upstream — that's expected
			const res = await fetch(`${server.url}/resource/nonexistent.json`);
			expect(res.status).toBeGreaterThanOrEqual(400);
		} finally {
			await server.close();
			process.env.SOCRATA_APP_TOKEN = originalToken;
		}
	});
});
