import { resolve } from "node:path";
import { TestServer } from "@soda3js/server";
import type { Layer } from "effect";
import { Effect, Stream } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SodaClient } from "../../src/services/SodaClient.js";
import { makeTestLayer } from "./utils/test-layer.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../../../__fixtures__/datasets/sf-films");

describe("client export integration", () => {
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

	it("exports CSV data as a byte stream", async () => {
		const program = Effect.gen(function* () {
			const soda = yield* SodaClient;
			const stream = yield* soda.export_("test.example.com", "yitu-d5am", "csv");
			const chunks = yield* Stream.runCollect(stream);
			return chunks;
		});
		const chunks = await Effect.runPromise(Effect.provide(program, layer));
		const decoder = new TextDecoder();
		const csv = Array.from(chunks)
			.map((chunk) => decoder.decode(chunk))
			.join("");
		expect(csv).toContain("title");
		expect(csv).toContain("release_year");
		expect(csv.split("\n").length).toBeGreaterThan(1);
	});
});
