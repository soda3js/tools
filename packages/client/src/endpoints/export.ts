import type { HttpClient, HttpClientError } from "@effect/platform";
import { HttpClientResponse } from "@effect/platform";
import { Effect, Stream } from "effect";
import type { SodaAuthError } from "../errors/SodaAuthError.js";
import type { SodaNotFoundError } from "../errors/SodaNotFoundError.js";
import type { SodaQueryError } from "../errors/SodaQueryError.js";
import type { SodaRateLimitError } from "../errors/SodaRateLimitError.js";
import { SodaServerError } from "../errors/SodaServerError.js";
import type { SodaTimeoutError } from "../errors/SodaTimeoutError.js";

type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

import { mapResponseError } from "./map-response-error.js";

/**
 * Exports dataset rows via GET /api/views/datasetId/rows.format?accessType=DOWNLOAD.
 *
 * Returns a Stream of raw bytes. No auth required.
 */
export function exportEndpoint(
	client: HttpClient.HttpClient,
	domain: string,
	datasetId: string,
	format: "csv" | "json" | "tsv",
): Effect.Effect<Stream.Stream<Uint8Array, SodaError>, SodaError> {
	return client.get(`/api/views/${datasetId}/rows.${format}?accessType=DOWNLOAD`).pipe(
		Effect.flatMap(HttpClientResponse.filterStatusOk),
		Effect.map((response) =>
			Stream.mapError(
				response.stream,
				() => new SodaServerError({ code: "stream_error", message: "Stream read failed" }) as SodaError,
			),
		),
		Effect.catchTag("ResponseError", (error: HttpClientError.ResponseError) =>
			mapResponseError(error, { domain, datasetId }),
		),
		Effect.catchTag("RequestError", () =>
			Effect.fail(new SodaServerError({ code: "request_error", message: "Request failed" })),
		),
	);
}
