import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Effect, Layer } from "effect";
import { SodaClientConfig } from "../../../src/schemas/SodaClientConfig.js";
import { SodaClient } from "../../../src/services/SodaClient.js";

/**
 * Creates a SodaClient layer that routes all requests to a local TestServer.
 *
 * Uses HttpClient.make to create a client that rewrites request URLs to
 * the test server's http://localhost address before passing them to fetch.
 */
export function makeTestLayer(serverUrl: string): Layer.Layer<SodaClient> {
	const config = new SodaClientConfig({});

	const testClient = HttpClient.make((request, url, _signal, _fiber) => {
		const rewritten = `${serverUrl}${url.pathname}${url.search}`;
		const rewrittenRequest = HttpClientRequest.setUrl(request, rewritten);
		return Effect.tryPromise({
			try: async () => {
				const headers: Record<string, string> = {};
				for (const [key, value] of Object.entries(rewrittenRequest.headers)) {
					if (typeof value === "string") {
						headers[key] = value;
					}
				}
				const init: RequestInit = {
					method: rewrittenRequest.method,
					headers,
				};
				const response = await fetch(rewritten, init);
				return HttpClientResponse.fromWeb(rewrittenRequest, response);
			},
			catch: (error) => {
				return new Error(`Fetch failed: ${error}`);
			},
		});
	});

	const httpLayer = Layer.succeed(HttpClient.HttpClient, testClient);
	return Layer.effect(SodaClient, SodaClient.makeSodaClient(config)).pipe(Layer.provide(httpLayer));
}
