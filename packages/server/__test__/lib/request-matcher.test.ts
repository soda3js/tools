import { describe, expect, it } from "vitest";
import { hashBody } from "../../src/lib/fixture-loader.js";
import { matchRequest } from "../../src/lib/request-matcher.js";
import type { FixtureIndex, IndexedFixture, ParsedRequest } from "../../src/lib/types.js";

function makeFixture(requestOverrides: Partial<IndexedFixture["envelope"]["request"]> = {}): IndexedFixture {
	return {
		envelope: {
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
				...requestOverrides,
			},
			response: {
				status: 200,
				content_type: "application/json",
				headers: {},
				body_file: "test.body.json",
			},
		},
		envelopePath: "/fixtures/test.json",
		bodyPath: "/fixtures/test.body.json",
	};
}

describe("matchRequest", () => {
	it("matches GET request by method + path", () => {
		const fixture = makeFixture();
		const index: FixtureIndex = { entries: new Map(), pathEntries: new Map() };
		index.entries.set("GET:/resource/test-1234.json", fixture);
		index.pathEntries.set("GET:/resource/test-1234.json", fixture);

		const req: ParsedRequest = {
			method: "GET",
			path: "/resource/test-1234.json",
			query: {},
			headers: {},
			body: null,
		};
		const result = matchRequest(index, req);
		expect(result).not.toBeNull();
		expect(result?.envelope.dataset_id).toBe("test-1234");
	});

	it("returns null for unmatched request", () => {
		const index: FixtureIndex = { entries: new Map(), pathEntries: new Map() };
		const req: ParsedRequest = {
			method: "GET",
			path: "/resource/unknown.json",
			query: {},
			headers: {},
			body: null,
		};
		expect(matchRequest(index, req)).toBeNull();
	});

	it("matches POST request by method + path + body hash", () => {
		const body = { $select: "*", page: { pageNumber: 1, pageSize: 2 } };
		const fixture = makeFixture({
			method: "POST",
			path: "/api/v3/views/test-1234/query.json",
			headers: { "content-type": "application/json" },
			body,
		});
		const index: FixtureIndex = { entries: new Map(), pathEntries: new Map() };
		const bodyHash = hashBody(body);
		index.entries.set(`POST:/api/v3/views/test-1234/query.json:${bodyHash}`, fixture);
		index.pathEntries.set("POST:/api/v3/views/test-1234/query.json", fixture);

		const req: ParsedRequest = {
			method: "POST",
			path: "/api/v3/views/test-1234/query.json",
			query: {},
			headers: { "content-type": "application/json" },
			body: { $select: "*", page: { pageNumber: 1, pageSize: 2 } },
		};
		const result = matchRequest(index, req);
		expect(result).not.toBeNull();
	});

	it("falls back to path-only match when body hash differs", () => {
		const fixture = makeFixture({
			method: "POST",
			path: "/api/v3/views/test-1234/query.json",
			headers: {},
			body: { $select: "*", page: { pageNumber: 1, pageSize: 2 } },
		});
		const index: FixtureIndex = { entries: new Map(), pathEntries: new Map() };
		index.pathEntries.set("POST:/api/v3/views/test-1234/query.json", fixture);

		const req: ParsedRequest = {
			method: "POST",
			path: "/api/v3/views/test-1234/query.json",
			query: {},
			headers: {},
			body: { $select: "id", page: { pageNumber: 99, pageSize: 50 } },
		};
		const result = matchRequest(index, req);
		expect(result).not.toBeNull();
	});
});
