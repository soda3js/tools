import { resolve } from "node:path";
import { TestServer } from "@soda3js/server";
import { SoQL } from "@soda3js/soql";
import type { Layer } from "effect";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SodaClient } from "../../src/services/SodaClient.js";
import { makeTestLayer } from "./utils/test-layer.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../../../__fixtures__/datasets/sf-films");

describe("client round-trip integration", () => {
	let server: TestServer;
	let layer: Layer.Layer<SodaClient>;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
		});
		layer = makeTestLayer(server.url);
	});

	afterAll(async () => {
		await server.close();
	});

	it("queries dataset and returns rows via SODA2", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("test.example.com", "yitu-d5am", SoQL.query().limit(5));
		});
		const rows = await Effect.runPromise(Effect.provide(program, layer));
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.length).toBeLessThanOrEqual(5);
	});

	it("fetches metadata", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.metadata("test.example.com", "yitu-d5am");
		});
		const meta = await Effect.runPromise(Effect.provide(program, layer));
		expect(meta.name).toBe("Film Locations in San Francisco");
		expect(meta.columns.length).toBeGreaterThan(0);
		expect(meta.id).toBe("yitu-d5am");
	});

	it("returns rows with expected fields", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("test.example.com", "yitu-d5am", SoQL.query());
		});
		const rows = await Effect.runPromise(Effect.provide(program, layer));
		expect(rows.length).toBeGreaterThan(0);
		const first = rows[0] as Record<string, unknown>;
		expect(first).toHaveProperty("title");
		expect(first).toHaveProperty("release_year");
	});
});
