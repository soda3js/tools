import { FetchHttpClient } from "@effect/platform";
import { SoQL } from "@soda3js/soql";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { SodaClientConfig } from "../../src/schemas/SodaClientConfig.js";
import { SodaClient } from "../../src/services/SodaClient.js";

const HAS_TOKEN = !!process.env.SOCRATA_APP_TOKEN;

function makeLiveLayer(mode?: "soda2" | "soda3"): Layer.Layer<SodaClient> {
	const config = new SodaClientConfig({
		...(process.env.SOCRATA_APP_TOKEN !== undefined ? { appToken: process.env.SOCRATA_APP_TOKEN } : {}),
		...(mode !== undefined ? { mode } : {}),
	});
	return Layer.effect(SodaClient, SodaClient.makeSodaClient(config)).pipe(Layer.provide(FetchHttpClient.layer));
}

describe.skipIf(!HAS_TOKEN)("e2e: NYC 311 (data.cityofnewyork.us)", () => {
	const DOMAIN = "data.cityofnewyork.us";
	const DATASET = "erm2-nwe9";

	it("metadata returns dataset info", async () => {
		const layer = makeLiveLayer();
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.metadata(DOMAIN, DATASET);
		});
		const meta = await Effect.runPromise(Effect.provide(program, layer));
		expect(meta.name).toBeDefined();
		expect(meta.columns.length).toBeGreaterThan(0);
	}, 30_000);

	it("query returns rows with expected shape", async () => {
		// Use NYC restaurants (43nn-pn8j) instead of 311 for query test;
		// 311 has 30M+ rows and SODA queries are unreliably slow on it
		const RESTAURANTS = "43nn-pn8j";
		const layer = makeLiveLayer();
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query(DOMAIN, RESTAURANTS, SoQL.query().select(SoQL.raw("*")).limit(3));
		});
		const rows = await Effect.runPromise(Effect.provide(program, layer));
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.length).toBeLessThanOrEqual(3);
	}, 30_000);
});
