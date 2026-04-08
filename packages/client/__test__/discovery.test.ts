import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { SodaClient, SodaClientConfig } from "../src/index.js";

const mockCatalogResponse = {
	results: [
		{
			resource: {
				id: "yitu-d5am",
				name: "Film Locations",
				description: "Films in SF",
				type: "dataset",
				updatedAt: "2026-01-15T00:00:00.000Z",
				columnsFieldName: ["title", "locations"],
				columnsDataType: ["text", "text"],
			},
			classification: {
				categories: ["Culture"],
				tags: ["film"],
				domain_category: "Culture",
				domain_tags: ["film"],
			},
			metadata: { domain: "data.sfgov.org" },
			permalink: "https://data.sfgov.org/d/yitu-d5am",
		},
	],
	resultSetSize: 1,
};

function makeMockLayer(responseBody: unknown) {
	const requests: string[] = [];
	const mockClient = HttpClient.make((req) => {
		requests.push(req.url);
		return Effect.succeed(
			HttpClientResponse.fromWeb(
				req,
				new Response(JSON.stringify(responseBody), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		);
	});
	const httpLayer = Layer.succeed(HttpClient.HttpClient, mockClient);
	const config = new SodaClientConfig({});
	const sodaLayer = Layer.effect(SodaClient, SodaClient.makeSodaClient(config)).pipe(Layer.provide(httpLayer));
	return { layer: sodaLayer, requests };
}

describe("SodaClient.discover", () => {
	it("searches by keyword", async () => {
		const { layer, requests } = makeMockLayer(mockCatalogResponse);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.discover({ q: "film" });
		});
		const result = await Effect.runPromise(Effect.provide(program, layer));
		expect(result.results).toHaveLength(1);
		expect(result.results[0].resource.name).toBe("Film Locations");
		expect(requests[0]).toContain("api.us.socrata.com");
		expect(requests[0]).toContain("q=film");
	});

	it("filters by domain", async () => {
		const { layer, requests } = makeMockLayer(mockCatalogResponse);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.discover({
				q: "film",
				domains: ["data.sfgov.org"],
			});
		});
		await Effect.runPromise(Effect.provide(program, layer));
		expect(requests[0]).toContain("domains=data.sfgov.org");
	});

	it("respects limit and offset", async () => {
		const { layer, requests } = makeMockLayer(mockCatalogResponse);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.discover({ q: "test", limit: 5, offset: 10 });
		});
		await Effect.runPromise(Effect.provide(program, layer));
		expect(requests[0]).toContain("limit=5");
		expect(requests[0]).toContain("offset=10");
	});
});
