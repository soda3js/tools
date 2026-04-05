import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeFixture } from "../../src/lib/fixture-writer.js";
import type { FixtureEnvelope } from "../../src/lib/types.js";

const TEST_DIR = join(tmpdir(), "soda3-server-test-fixtures");

afterEach(async () => {
	await rm(TEST_DIR, { recursive: true, force: true });
});

describe("writeFixture", () => {
	it("writes envelope and JSON body as separate files", async () => {
		const envelope: FixtureEnvelope = {
			dataset_id: "test-1234",
			portal: "test.example.com",
			recorded_at: "2026-04-04T00:00:00.000Z",
			latency_ms: 100,
			auth: { required: false, token_used: false },
			request: {
				method: "GET",
				path: "/resource/test-1234.json",
				headers: {},
				body: null,
			},
			response: {
				status: 200,
				content_type: "application/json",
				headers: {},
				body_file: "",
			},
		};
		const body = Buffer.from(JSON.stringify([{ id: "1" }]));

		const result = await writeFixture(TEST_DIR, envelope, body);

		expect(existsSync(result.envelopePath)).toBe(true);
		expect(existsSync(result.bodyPath)).toBe(true);

		const savedEnvelope = JSON.parse(await readFile(result.envelopePath, "utf-8"));
		expect(savedEnvelope.response.body_file).toBeTruthy();
		expect(savedEnvelope.dataset_id).toBe("test-1234");

		const savedBody = await readFile(result.bodyPath, "utf-8");
		expect(JSON.parse(savedBody)).toEqual([{ id: "1" }]);
	});

	it("writes CSV body with .body.csv extension", async () => {
		const envelope: FixtureEnvelope = {
			dataset_id: "test-1234",
			portal: "test.example.com",
			recorded_at: "2026-04-04T00:00:00.000Z",
			latency_ms: 100,
			auth: { required: false, token_used: false },
			request: {
				method: "GET",
				path: "/api/views/test-1234/rows.csv",
				headers: {},
				body: null,
			},
			response: {
				status: 200,
				content_type: "text/csv",
				headers: {},
				body_file: "",
			},
		};
		const body = Buffer.from("id,name\n1,Test");

		const result = await writeFixture(TEST_DIR, envelope, body);
		expect(result.bodyPath).toContain(".body.csv");

		const savedBody = await readFile(result.bodyPath, "utf-8");
		expect(savedBody).toBe("id,name\n1,Test");
	});

	it("does not overwrite existing fixtures when overwrite is false", async () => {
		const envelope: FixtureEnvelope = {
			dataset_id: "test-1234",
			portal: "test.example.com",
			recorded_at: "2026-04-04T00:00:00.000Z",
			latency_ms: 100,
			auth: { required: false, token_used: false },
			request: {
				method: "GET",
				path: "/resource/test-1234.json",
				headers: {},
				body: null,
			},
			response: {
				status: 200,
				content_type: "application/json",
				headers: {},
				body_file: "",
			},
		};
		const body1 = Buffer.from(JSON.stringify([{ id: "1" }]));
		const body2 = Buffer.from(JSON.stringify([{ id: "2" }]));

		const first = await writeFixture(TEST_DIR, envelope, body1);
		await writeFixture(TEST_DIR, envelope, body2, { overwrite: false });

		const savedBody = await readFile(first.bodyPath, "utf-8");
		expect(JSON.parse(savedBody)).toEqual([{ id: "1" }]);
	});

	it("redacts auth tokens in saved envelopes", async () => {
		const envelope: FixtureEnvelope = {
			dataset_id: "test-1234",
			portal: "test.example.com",
			recorded_at: "2026-04-04T00:00:00.000Z",
			latency_ms: 100,
			auth: { required: true, token_used: true },
			request: {
				method: "POST",
				path: "/api/v3/views/test-1234/query.json",
				headers: { "x-app-token": "secret-token-value" },
				body: { $select: "*" },
			},
			response: {
				status: 200,
				content_type: "application/json",
				headers: {},
				body_file: "",
			},
		};
		const body = Buffer.from("[]");

		const result = await writeFixture(TEST_DIR, envelope, body);
		const saved = JSON.parse(await readFile(result.envelopePath, "utf-8"));
		expect(saved.request.headers["x-app-token"]).toBe("[REDACTED]");
	});
});
