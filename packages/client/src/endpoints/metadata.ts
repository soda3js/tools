import type { HttpClient, HttpClientError } from "@effect/platform";
import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
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

import { DatasetMetadata } from "../schemas/DatasetMetadata.js";
import { mapResponseError } from "./map-response-error.js";

/**
 * Fetches dataset metadata via GET /api/views/datasetId.json.
 *
 * This endpoint is version-independent and does not require authentication.
 */
export function metadataEndpoint(
	client: HttpClient.HttpClient,
	domain: string,
	datasetId: string,
): Effect.Effect<DatasetMetadata, SodaError> {
	return client.get(`/api/views/${datasetId}.json`).pipe(
		Effect.flatMap(HttpClientResponse.filterStatusOk),
		Effect.flatMap((response) => response.json),
		Effect.flatMap((json) => Schema.decodeUnknown(DatasetMetadata)(json)),
		Effect.catchTag("ResponseError", (error: HttpClientError.ResponseError) =>
			mapResponseError(error, { domain, datasetId }),
		),
		Effect.catchTag("RequestError", () =>
			Effect.fail(new SodaServerError({ code: "request_error", message: "Request failed" })),
		),
		Effect.catchTag("ParseError", () =>
			Effect.fail(new SodaServerError({ code: "parse_error", message: "Failed to decode metadata response" })),
		),
	);
}
