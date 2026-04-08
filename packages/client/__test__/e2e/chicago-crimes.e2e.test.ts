import { FetchHttpClient } from "@effect/platform";
import { SoQL } from "@soda3js/soql";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { SodaClientConfig } from "../../src/schemas/SodaClientConfig.js";
import { SodaClient } from "../../src/services/SodaClient.js";

const HAS_TOKEN = !!process.env.SOCRATA_APP_TOKEN;

function makeLiveLayer(): Layer.Layer<SodaClient> {
	const config = new SodaClientConfig({
		...(process.env.SOCRATA_APP_TOKEN !== undefined ? { appToken: process.env.SOCRATA_APP_TOKEN } : {}),
	});
	return Layer.effect(SodaClient, SodaClient.makeSodaClient(config)).pipe(Layer.provide(FetchHttpClient.layer));
}

describe.skipIf(!HAS_TOKEN)("e2e: Chicago Crimes (data.cityofchicago.org)", () => {
	const DOMAIN = "data.cityofchicago.org";
	const DATASET = "ijzp-q8t2";

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

	it("query returns rows", async () => {
		const layer = makeLiveLayer();
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query(DOMAIN, DATASET, SoQL.query().select(SoQL.raw("*")).limit(5));
		});
		const rows = await Effect.runPromise(Effect.provide(program, layer));
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.length).toBeLessThanOrEqual(5);
	}, 60_000);

	it("cross-portal behavior validates dataset shapes", async () => {
		const layer = makeLiveLayer();
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			const meta = yield* soda.metadata(DOMAIN, DATASET);
			const fieldNames = meta.columns.map((c) => c.fieldName);
			return fieldNames;
		});
		const fields = await Effect.runPromise(Effect.provide(program, layer));
		expect(fields.length).toBeGreaterThan(0);
		expect(fields).toEqual(expect.arrayContaining([expect.any(String)]));
	}, 30_000);
});
