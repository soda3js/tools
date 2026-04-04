import type { HttpClient, HttpClientError } from "@effect/platform";
import { HttpClientRequest, HttpClientResponse } from "@effect/platform";
import type { SoQLBuilder } from "@soda3js/soql";
import { Effect } from "effect";
import type { SodaAuthError } from "../errors/SodaAuthError.js";
import type { SodaNotFoundError } from "../errors/SodaNotFoundError.js";
import type { SodaQueryError } from "../errors/SodaQueryError.js";
import type { SodaRateLimitError } from "../errors/SodaRateLimitError.js";
import { SodaServerError } from "../errors/SodaServerError.js";
import type { SodaTimeoutError } from "../errors/SodaTimeoutError.js";
import type { ApiMode } from "../utils/mode.js";

type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

import { mapResponseError } from "./map-response-error.js";

/**
 * Executes a single-page query against a SODA dataset.
 *
 * - SODA2: GET /resource/datasetId.json?soql.toParams()
 * - SODA3: POST /api/v3/views/datasetId/query.json with JSON body
 */
export function queryEndpoint(
	client: HttpClient.HttpClient,
	domain: string,
	datasetId: string,
	soql: SoQLBuilder,
	mode: ApiMode,
): Effect.Effect<ReadonlyArray<Record<string, unknown>>, SodaError> {
	if (mode === "soda2") {
		return client.get(`/resource/${datasetId}.json?${soql.toParams()}`).pipe(
			Effect.flatMap(HttpClientResponse.filterStatusOk),
			Effect.flatMap((response) => response.json),
			Effect.flatMap((json) =>
				Array.isArray(json)
					? Effect.succeed(json as ReadonlyArray<Record<string, unknown>>)
					: Effect.fail(new SodaServerError({ code: "unexpected_response", message: "Expected array response" })),
			),
			Effect.catchTag("ResponseError", (error: HttpClientError.ResponseError) =>
				mapResponseError(error, { domain, datasetId, soql: soql.toParams() }),
			),
			Effect.catchTag("RequestError", () =>
				Effect.fail(new SodaServerError({ code: "request_error", message: "Request failed" })),
			),
		);
	}

	// SODA3 mode
	return Effect.gen(function* () {
		const request = yield* HttpClientRequest.bodyJson(HttpClientRequest.post(`/api/v3/views/${datasetId}/query.json`), {
			query: soql.toBody(),
		});
		const response = yield* client.execute(request);
		const okResponse = yield* HttpClientResponse.filterStatusOk(response);
		const json = yield* okResponse.json;
		if (!Array.isArray(json)) {
			return yield* Effect.fail(
				new SodaServerError({ code: "unexpected_response", message: "Expected array response" }),
			);
		}
		return json as ReadonlyArray<Record<string, unknown>>;
	}).pipe(
		Effect.catchTag("ResponseError", (error: HttpClientError.ResponseError) =>
			mapResponseError(error, { domain, datasetId, soql: soql.toBody() }),
		),
		Effect.catchTag("RequestError", () =>
			Effect.fail(new SodaServerError({ code: "request_error", message: "Request failed" })),
		),
		Effect.catchTag("HttpBodyError", () =>
			Effect.fail(new SodaServerError({ code: "body_error", message: "Failed to encode request body" })),
		),
	);
}
