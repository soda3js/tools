import type { HttpClientRequest } from "@effect/platform";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import { SoQL } from "@soda3js/soql";
import { Chunk, Effect, Layer, Option, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { SodaAuthError } from "../src/errors/SodaAuthError.js";
import { SodaNotFoundError } from "../src/errors/SodaNotFoundError.js";
import { SodaQueryError } from "../src/errors/SodaQueryError.js";
import { SodaRateLimitError } from "../src/errors/SodaRateLimitError.js";
import { SodaServerError } from "../src/errors/SodaServerError.js";
import { SodaClientLive } from "../src/layers/SodaClientLive.js";
import { SodaClient } from "../src/services/SodaClient.js";
import type { CapturedRequest } from "./utils/mock-http-client.js";

/**
 * Creates a mock HttpClient that captures requests and returns configurable responses.
 */
function makeMock(
	respond?: (
		request: HttpClientRequest.HttpClientRequest,
		url: URL,
	) => { status: number; body: unknown; headers?: Record<string, string> },
) {
	const requests: CapturedRequest[] = [];

	const respondFn = respond ?? (() => ({ status: 200, body: [] }));

	const client = HttpClient.make((request, url) => {
		const captured: CapturedRequest = {
			url: url.toString(),
			method: request.method,
			headers: Object.fromEntries(
				Object.entries(request.headers).map(([k, v]) => [
					k,
					Option.isOption(v) ? (Option.isSome(v) ? String(v.value) : undefined) : String(v),
				]),
			),
		};
		requests.push(captured);

		const { status, body, headers: responseHeaders } = respondFn(request, url);
		const webResponse = new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json", ...responseHeaders },
		});

		return Effect.succeed(HttpClientResponse.fromWeb(request, webResponse));
	});

	const layer = Layer.succeed(HttpClient.HttpClient, client);

	return { requests, layer };
}

describe("SodaClient endpoints", () => {
	const domain = "data.example.com";
	const datasetId = "abcd-1234";
	const soql = SoQL.query().select("name", "value").limit(10);

	describe("query()", () => {
		it("SODA2 mode sends GET with params", async () => {
			const rows = [{ name: "Alice", value: 42 }];
			const mock = makeMock(() => ({ status: 200, body: rows }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result).toEqual(rows);
			expect(mock.requests).toHaveLength(1);
			const req = mock.requests[0];
			expect(req.method).toBe("GET");
			expect(req.url).toContain(`/resource/${datasetId}.json`);
			expect(req.url).toContain(soql.toParams());
		});

		it("SODA2 mode rejects non-array response", async () => {
			const mock = makeMock(() => ({ status: 200, body: { unexpected: "object" } }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
				expect((result.left as SodaServerError).code).toBe("unexpected_response");
			}
		});

		it("SODA3 mode sends POST with body", async () => {
			const rows = [{ name: "Bob", value: 99 }];
			const mock = makeMock(() => ({ status: 200, body: rows }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "test-token", mode: "soda3" });
					return yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result).toEqual(rows);
			expect(mock.requests).toHaveLength(1);
			const req = mock.requests[0];
			expect(req.method).toBe("POST");
			expect(req.url).toContain(`/api/v3/views/${datasetId}/query.json`);
		});

		it("SODA3 mode rejects non-array response", async () => {
			const mock = makeMock(() => ({ status: 200, body: { unexpected: "object" } }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "test-token", mode: "soda3" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
				expect((result.left as SodaServerError).code).toBe("unexpected_response");
			}
		});
	});

	describe("metadata()", () => {
		it("sends GET to /api/views/{id}.json and decodes response", async () => {
			const metadataPayload = {
				id: datasetId,
				name: "Test Dataset",
				columns: [
					{
						id: 1,
						fieldName: "name",
						dataTypeName: "text",
						renderTypeName: "text",
						position: 1,
					},
				],
				owner: { id: "owner-1", displayName: "Admin" },
				rowsUpdatedAt: 1700000000,
				viewLastModified: 1700000000,
			};
			const mock = makeMock(() => ({ status: 200, body: metadataPayload }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* soda.metadata(domain, datasetId);
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result.id).toBe(datasetId);
			expect(result.name).toBe("Test Dataset");
			expect(result.columns).toHaveLength(1);
			expect(mock.requests[0].url).toContain(`/api/views/${datasetId}.json`);
			expect(mock.requests[0].method).toBe("GET");
		});
	});

	describe("error mapping", () => {
		it("403 maps to SodaAuthError", async () => {
			const mock = makeMock(() => ({
				status: 403,
				body: { code: "authentication_required", error: true, message: "App token required" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaAuthError);
				expect((result.left as SodaAuthError).code).toBe("authentication_required");
			}
		});

		it("404 maps to SodaNotFoundError", async () => {
			const mock = makeMock(() => ({
				status: 404,
				body: { code: "not_found", error: true, message: "Dataset not found" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.metadata(domain, datasetId));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaNotFoundError);
				const err = result.left as SodaNotFoundError;
				expect(err.domain).toBe(domain);
				expect(err.datasetId).toBe(datasetId);
			}
		});

		it("400 maps to SodaQueryError", async () => {
			const mock = makeMock(() => ({
				status: 400,
				body: { code: "query.execution.queryTooComplex", error: true, message: "Bad query" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaQueryError);
			}
		});

		it("429 maps to SodaRateLimitError", async () => {
			const mock = makeMock(() => ({
				status: 429,
				body: { code: "rate_limit", error: true, message: "Too many requests" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaRateLimitError);
			}
		});

		it("500 maps to SodaServerError", async () => {
			const mock = makeMock(() => ({
				status: 500,
				body: { code: "internal_error", error: true, message: "Something went wrong" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
			}
		});
	});

	describe("queryAll()", () => {
		it("returns Stream that collects paginated results", async () => {
			let callCount = 0;
			const mock = makeMock(() => {
				callCount++;
				// First call returns data, second returns empty to signal end
				if (callCount === 1) {
					return { status: 200, body: [{ id: 1 }, { id: 2 }] };
				}
				return { status: 200, body: [] };
			});

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					const stream = yield* soda.queryAll(domain, datasetId, soql);
					return yield* Stream.runCollect(stream);
				}).pipe(Effect.provide(mock.layer)),
			);

			const arr = Array.from(result);
			expect(arr).toEqual([{ id: 1 }, { id: 2 }]);
			expect(callCount).toBe(2);
		});
	});

	describe("export_()", () => {
		it("sends GET to rows export URL", async () => {
			const mock = makeMock(() => ({ status: 200, body: "col1,col2\na,b" }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					const _stream = yield* soda.export_(domain, datasetId, "csv");
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(mock.requests).toHaveLength(1);
			const req = mock.requests[0];
			expect(req.method).toBe("GET");
			expect(req.url).toContain(`/api/views/${datasetId}/rows.csv`);
			expect(req.url).toContain("accessType=DOWNLOAD");
		});
	});

	describe("makeSodaClient wiring", () => {
		it("uses per-domain token when configured", async () => {
			const mock = makeMock(() => ({ status: 200, body: [] }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({
						appToken: "global-tok",
						domains: { [domain]: { appToken: "domain-tok" } },
						mode: "soda2",
					});
					yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			const tokenHeader = mock.requests[0].headers["x-app-token"];
			expect(tokenHeader).toBe("domain-tok");
		});

		it("falls back to global token when no per-domain token", async () => {
			const mock = makeMock(() => ({ status: 200, body: [] }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({
						appToken: "global-tok",
						mode: "soda2",
					});
					yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			const tokenHeader = mock.requests[0].headers["x-app-token"];
			expect(tokenHeader).toBe("global-tok");
		});

		it("resolves mode to soda3 when appToken provided and mode is auto", async () => {
			const mock = makeMock(() => ({ status: 200, body: [] }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "test-token" });
					yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			// Should use SODA3 POST endpoint
			expect(mock.requests[0].method).toBe("POST");
			expect(mock.requests[0].url).toContain("/api/v3/views/");
		});

		it("resolves mode to soda3 when per-domain token present and mode is auto", async () => {
			const mock = makeMock(() => ({ status: 200, body: [] }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({
						domains: { [domain]: { appToken: "domain-tok" } },
					});
					yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			// Per-domain token should trigger SODA3 POST mode
			expect(mock.requests[0].method).toBe("POST");
			expect(mock.requests[0].url).toContain("/api/v3/views/");
		});

		it("resolves mode to soda2 when no appToken and mode is auto", async () => {
			const mock = makeMock(() => ({ status: 200, body: [] }));

			await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({});
					yield* soda.query(domain, datasetId, soql);
				}).pipe(Effect.provide(mock.layer)),
			);

			// Should use SODA2 GET endpoint
			expect(mock.requests[0].method).toBe("GET");
			expect(mock.requests[0].url).toContain("/resource/");
		});
	});

	describe("SodaClientLive", () => {
		it("uses default config when called without arguments", () => {
			const layer = SodaClientLive();
			expect(layer).toBeDefined();
		});
	});

	describe("queryAll() SODA3 pagination path", () => {
		it("uses paginateSoda3 when mode is soda3", async () => {
			let callCount = 0;
			const mock = makeMock(() => {
				callCount++;
				if (callCount === 1) {
					return { status: 200, body: [{ id: 1 }] };
				}
				return { status: 200, body: [] };
			});

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "test-token", mode: "soda3" });
					const stream = yield* soda.queryAll(domain, datasetId, soql);
					return yield* Stream.runCollect(stream);
				}).pipe(Effect.provide(mock.layer)),
			);

			const arr = Array.from(result);
			expect(arr).toEqual([{ id: 1 }]);
			expect(callCount).toBe(2);
		});
	});

	describe("export_() stream collection", () => {
		it("collects stream bytes from response", async () => {
			const mock = makeMock(() => ({ status: 200, body: "col1,col2\na,b" }));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					const stream = yield* soda.export_(domain, datasetId, "csv");
					const chunks = yield* Stream.runCollect(stream);
					return Chunk.toReadonlyArray(chunks);
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toBeInstanceOf(Uint8Array);
		});
	});

	describe("RequestError handling", () => {
		it("query (soda2) catches RequestError and returns SodaServerError", async () => {
			const client = HttpClient.make(() =>
				Effect.fail({
					_tag: "RequestError" as const,
					reason: "Decode" as const,
					error: new Error("fail"),
					request: {} as never,
					message: "fail",
					description: "fail",
				}),
			);
			const layer = Layer.succeed(HttpClient.HttpClient, client);

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
				expect((result.left as SodaServerError).code).toBe("request_error");
			}
		});

		it("query (soda3) catches RequestError and returns SodaServerError", async () => {
			const client = HttpClient.make(() =>
				Effect.fail({
					_tag: "RequestError" as const,
					reason: "Decode" as const,
					error: new Error("fail"),
					request: {} as never,
					message: "fail",
					description: "fail",
				}),
			);
			const layer = Layer.succeed(HttpClient.HttpClient, client);

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "tok", mode: "soda3" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
				expect((result.left as SodaServerError).code).toBe("request_error");
			}
		});

		it("query (soda3) catches ResponseError and maps it", async () => {
			const mock = makeMock((_request, url) => {
				if (url.pathname.includes("/api/v3/views/")) {
					return { status: 500, body: { code: "internal_error", error: true, message: "Server error" } };
				}
				return { status: 200, body: [] };
			});

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ appToken: "tok", mode: "soda3" });
					return yield* Effect.either(soda.query(domain, datasetId, soql));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
			}
		});

		it("metadata catches RequestError and returns SodaServerError", async () => {
			const client = HttpClient.make(() =>
				Effect.fail({
					_tag: "RequestError" as const,
					reason: "Decode" as const,
					error: new Error("fail"),
					request: {} as never,
					message: "fail",
					description: "fail",
				}),
			);
			const layer = Layer.succeed(HttpClient.HttpClient, client);

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.metadata(domain, datasetId));
				}).pipe(Effect.provide(layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
			}
		});

		it("export_ catches ResponseError for non-OK status", async () => {
			const mock = makeMock(() => ({
				status: 500,
				body: { code: "internal_error", error: true, message: "Server error" },
			}));

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.export_(domain, datasetId, "csv"));
				}).pipe(Effect.provide(mock.layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
			}
		});

		it("export_ catches RequestError and returns SodaServerError", async () => {
			const client = HttpClient.make(() =>
				Effect.fail({
					_tag: "RequestError" as const,
					reason: "Decode" as const,
					error: new Error("fail"),
					request: {} as never,
					message: "fail",
					description: "fail",
				}),
			);
			const layer = Layer.succeed(HttpClient.HttpClient, client);

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const soda = yield* SodaClient.makeSodaClient({ mode: "soda2" });
					return yield* Effect.either(soda.export_(domain, datasetId, "csv"));
				}).pipe(Effect.provide(layer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(SodaServerError);
			}
		});
	});
});
