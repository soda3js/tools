import { resolve } from "node:path";
import { TestServer } from "@soda3js/server";
import { SoQL } from "@soda3js/soql";
import type { Layer } from "effect";
import { Effect, Exit } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SodaClient } from "../../src/services/SodaClient.js";
import { makeTestLayer } from "./utils/test-layer.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../../../__fixtures__/datasets/sf-films");

describe("client error handling integration", () => {
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

	it("fails for nonexistent dataset query", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.query("test.example.com", "xxxx-yyyy", SoQL.query().limit(1));
		});
		const exit = await Effect.runPromiseExit(Effect.provide(program, layer));
		expect(Exit.isFailure(exit)).toBe(true);
	});

	it("fails for nonexistent dataset metadata", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.metadata("test.example.com", "xxxx-yyyy");
		});
		const exit = await Effect.runPromiseExit(Effect.provide(program, layer));
		expect(Exit.isFailure(exit)).toBe(true);
	});

	it("fails when auth is required but no token provided", async () => {
		const authServer = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
			auth: { required: true, token: "secret-token" },
		});

		try {
			const authLayer = makeTestLayer(authServer.url);
			const program = Effect.gen(function* () {
				const soda = yield* SodaClient;
				return yield* soda.query("test.example.com", "yitu-d5am", SoQL.query().limit(1));
			});
			const exit = await Effect.runPromiseExit(Effect.provide(program, authLayer));
			expect(Exit.isFailure(exit)).toBe(true);
		} finally {
			await authServer.close();
		}
	});

	it("fails for nonexistent export", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			return yield* soda.export_("test.example.com", "xxxx-yyyy", "csv");
		});
		const exit = await Effect.runPromiseExit(Effect.provide(program, layer));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});
