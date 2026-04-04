import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { Soda3ClientBase } from "../src/soda3-client.js";
import { makeMockHttpClient } from "./utils/mock-http-client.js";

describe("Soda3ClientBase", () => {
	it("constructs with domain only", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com" });
		expect(client).toBeInstanceOf(Soda3ClientBase);
	});

	it("constructs with domain and appToken", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com", appToken: "test-token" });
		expect(client).toBeInstanceOf(Soda3ClientBase);
	});

	it("constructs with explicit mode", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" });
		expect(client).toBeInstanceOf(Soda3ClientBase);
	});

	it("has query method", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com" });
		expect(typeof client.query).toBe("function");
	});

	it("has metadata method", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com" });
		expect(typeof client.metadata).toBe("function");
	});

	it("has queryAll method", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com" });
		expect(typeof client.queryAll).toBe("function");
	});

	it("has export_ method", () => {
		const client = new Soda3ClientBase({ domain: "data.example.com" });
		expect(typeof client.export_).toBe("function");
	});

	describe("with mock HttpClient", () => {
		it("query() returns rows from mock", async () => {
			const mock = makeMockHttpClient();
			const client = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, mock.layer);
			const result = await client.query("xxxx-yyyy");
			expect(result).toEqual([]);
		});

		it("metadata() rejects when mock returns invalid shape", async () => {
			const mock = makeMockHttpClient();
			const client = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, mock.layer);
			await expect(client.metadata("xxxx-yyyy")).rejects.toThrow();
		});

		it("queryAll() yields no rows when mock returns empty", async () => {
			const mock = makeMockHttpClient();
			const client = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, mock.layer);
			const items: Record<string, unknown>[] = [];
			for await (const item of client.queryAll("xxxx-yyyy")) {
				items.push(item);
			}
			expect(items).toEqual([]);
		});

		it("export_() returns a ReadableStream", () => {
			const mock = makeMockHttpClient();
			const client = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, mock.layer);
			const stream = client.export_("xxxx-yyyy", "csv");
			expect(stream).toBeInstanceOf(ReadableStream);
		});

		it("queryAll() yields rows when mock returns data", async () => {
			let callCount = 0;
			const requests: Array<{ url: string; method: string; headers: Record<string, string | undefined> }> = [];
			const client = HttpClient.make((request, url) => {
				const captured = {
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
				callCount++;
				const body = callCount === 1 ? [{ id: 1 }, { id: 2 }] : [];
				const webResponse = new Response(JSON.stringify(body), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
				return Effect.succeed(HttpClientResponse.fromWeb(request, webResponse));
			});
			const layer = Layer.succeed(HttpClient.HttpClient, client);
			const soda = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, layer);
			const items: Record<string, unknown>[] = [];
			for await (const item of soda.queryAll("xxxx-yyyy")) {
				items.push(item);
			}
			expect(items).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it("export_() stream errors on failure", async () => {
			const client = HttpClient.make(() => Effect.die(new Error("connection refused")));
			const layer = Layer.succeed(HttpClient.HttpClient, client);
			const soda = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, layer);
			const stream = soda.export_("xxxx-yyyy", "csv");
			const reader = stream.getReader();
			await expect(reader.read()).rejects.toBeDefined();
		});

		it("query() with options passes SoQL params", async () => {
			const mock = makeMockHttpClient();
			const soda = new Soda3ClientBase({ domain: "data.example.com", mode: "soda2" }, mock.layer);
			const result = await soda.query("xxxx-yyyy", {
				select: ["name", "value"],
				where: "value > 10",
				limit: 5,
				offset: 10,
				orderBy: "name",
			});
			expect(result).toEqual([]);
			expect(mock.requests[0].url).toContain("$select=");
		});
	});
});
