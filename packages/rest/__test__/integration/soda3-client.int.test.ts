import { resolve } from "node:path";
import { HttpClient, HttpClientError, HttpClientResponse } from "@effect/platform";
import { TestServer } from "@soda3js/server";
import { Effect, Layer } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Soda3ClientBase } from "../../src/soda3-client.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../../../__fixtures__/datasets/sf-films");

/**
 * Creates a platform layer that redirects all requests to the local TestServer.
 */
function makeRedirectLayer(serverUrl: string): Layer.Layer<HttpClient.HttpClient> {
	const testClient = HttpClient.make((request, url) => {
		const rewritten = `${serverUrl}${url.pathname}${url.search}`;
		const headers: Record<string, string> = {};
		for (const [key, value] of Object.entries(request.headers)) {
			if (typeof value === "string") {
				headers[key] = value;
			}
		}
		return Effect.tryPromise({
			try: async () => {
				const response = await fetch(rewritten, {
					method: request.method,
					headers,
				});
				return HttpClientResponse.fromWeb(request, response);
			},
			catch: (error) =>
				new HttpClientError.RequestError({
					request,
					reason: "Transport",
					cause: error,
				}),
		});
	});

	return Layer.succeed(HttpClient.HttpClient, testClient);
}

describe("Soda3Client integration", () => {
	let server: TestServer;
	let client: Soda3ClientBase;

	beforeAll(async () => {
		server = await TestServer.create({
			fixtures: FIXTURES_DIR,
			mode: "replay",
		});

		client = new Soda3ClientBase({ domain: "test.example.com" }, makeRedirectLayer(server.url));
	});

	afterAll(async () => {
		await server.close();
	});

	it("queries a dataset and returns rows", async () => {
		const rows = await client.query("yitu-d5am", { limit: 5 });
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.length).toBeLessThanOrEqual(5);
		const first = rows[0];
		expect(first).toHaveProperty("title");
	});

	it("fetches dataset metadata", async () => {
		const meta = await client.metadata("yitu-d5am");
		expect(meta.name).toBe("Film Locations in San Francisco");
		expect(meta.columns.length).toBeGreaterThan(0);
		expect(meta.id).toBe("yitu-d5am");
	});

	it("queries with select and where options", async () => {
		const rows = await client.query("yitu-d5am", { select: ["title", "release_year"], limit: 3 });
		expect(rows.length).toBeGreaterThan(0);
		const first = rows[0];
		expect(first).toHaveProperty("title");
	});

	it("returns error for nonexistent dataset", async () => {
		await expect(client.query("xxxx-yyyy")).rejects.toThrow();
	});
});
