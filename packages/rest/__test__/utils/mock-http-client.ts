import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Effect, Layer, Option } from "effect";

export interface CapturedRequest {
	readonly url: string;
	readonly method: string;
	readonly headers: Record<string, string | undefined>;
}

export interface MockHttpClientResult {
	readonly requests: CapturedRequest[];
	readonly layer: Layer.Layer<HttpClient.HttpClient>;
}

/**
 * Creates a mock HttpClient that captures outgoing requests for assertion and
 * returns a canned 200 OK response with an empty JSON array body.
 */
export function makeMockHttpClient(): MockHttpClientResult {
	const requests: CapturedRequest[] = [];

	const client = HttpClient.make((request, url) => {
		const captured: CapturedRequest = {
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

		const webResponse = new Response("[]", {
			status: 200,
			headers: { "content-type": "application/json" },
		});

		return Effect.succeed(HttpClientResponse.fromWeb(request, webResponse));
	});

	const layer = Layer.succeed(HttpClient.HttpClient, client);

	return { requests, layer };
}

/**
 * Returns the value of a named header from a captured request (case-insensitive).
 */
export function getHeader(captured: CapturedRequest, name: string): string | undefined {
	const lower = name.toLowerCase();
	for (const [key, value] of Object.entries(captured.headers)) {
		if (key.toLowerCase() === lower) return value;
	}
	return undefined;
}

/**
 * Runs a single GET request through the provided layer and returns all captured requests.
 */
export function runGetWith(
	layer: Layer.Layer<HttpClient.HttpClient>,
	url: string,
	requests: CapturedRequest[],
): Promise<CapturedRequest[]> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const client = yield* HttpClient.HttpClient;
			yield* client.get(url);
			return requests;
		}).pipe(Effect.provide(layer)),
	);
}

/**
 * Helper to run an Effect that requires HttpClient, providing the given layer.
 */
export function runWithLayer<A>(
	layer: Layer.Layer<HttpClient.HttpClient>,
	effect: Effect.Effect<A, never, HttpClient.HttpClient>,
): Promise<A> {
	return Effect.runPromise(Effect.provide(effect, layer));
}

/**
 * Runs a request through a layer built from makeAuthenticatedClient and returns the
 * first captured request. The innerLayer is the mock; outerLayer is auth middleware.
 */
export function runAuthTest(
	authLayer: Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient>,
	mockResult: MockHttpClientResult,
	url: string,
): Promise<CapturedRequest> {
	const composed = authLayer.pipe(Layer.provide(mockResult.layer));
	return Effect.runPromise(
		Effect.gen(function* () {
			const client = yield* HttpClient.HttpClient;
			yield* client.get(url);
			return mockResult.requests[0] as CapturedRequest;
		}).pipe(Effect.provide(composed)),
	);
}

/**
 * Convenience: capture the URL that was sent after auth middleware prepends base URL.
 */
export function captureAuthRequest(
	authLayer: Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient>,
	path: string,
): { requests: CapturedRequest[]; run: () => Promise<CapturedRequest> } {
	const mock = makeMockHttpClient();
	return {
		requests: mock.requests,
		run: () => runAuthTest(authLayer, mock, path),
	};
}

export { HttpClientRequest };
