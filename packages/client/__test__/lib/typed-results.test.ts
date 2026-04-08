import { HttpClient, HttpClientResponse } from "@effect/platform";
import { SoQL } from "@soda3js/soql";
import { Effect, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { SodaClientConfig } from "../../src/schemas/SodaClientConfig.js";
import { SodaClient } from "../../src/services/SodaClient.js";

const mockRows = [
	{ name: "Central Park", borough: "Manhattan" },
	{ name: "Prospect Park", borough: "Brooklyn" },
];

function makeMockLayer(responseBody: unknown) {
	const mockClient = HttpClient.make((req) =>
		Effect.succeed(
			HttpClientResponse.fromWeb(
				req,
				new Response(JSON.stringify(responseBody), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			),
		),
	);
	const httpLayer = Layer.succeed(HttpClient.HttpClient, mockClient);
	const config = new SodaClientConfig({});
	return Layer.effect(SodaClient, SodaClient.makeSodaClient(config)).pipe(Layer.provide(httpLayer));
}

describe("typed query results", () => {
	const ParkSchema = Schema.Struct({
		name: Schema.String,
		borough: Schema.String,
	});

	it("query with schema validates and types results", async () => {
		const layer = makeMockLayer(mockRows);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("example.com", "test-1234", SoQL.query(), {
				schema: ParkSchema,
			});
		});
		const result = await Effect.runPromise(Effect.provide(program, layer));
		expect(result).toEqual(mockRows);
	});

	it("query with schema rejects invalid data", async () => {
		const layer = makeMockLayer([{ name: 123, borough: true }]);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("example.com", "test-1234", SoQL.query(), {
				schema: ParkSchema,
			});
		});
		const result = await Effect.runPromiseExit(Effect.provide(program, layer));
		expect(result._tag).toBe("Failure");
	});

	it("query without schema returns Record<string, unknown>", async () => {
		const layer = makeMockLayer(mockRows);
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("example.com", "test-1234", SoQL.query());
		});
		const result = await Effect.runPromise(Effect.provide(program, layer));
		expect(result).toEqual(mockRows);
	});
});
