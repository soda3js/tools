import type { HttpClientError } from "@effect/platform";
import { Effect, Schema } from "effect";
import { SodaAuthError } from "../errors/SodaAuthError.js";
import { SodaNotFoundError } from "../errors/SodaNotFoundError.js";
import { SodaQueryError } from "../errors/SodaQueryError.js";
import { SodaRateLimitError } from "../errors/SodaRateLimitError.js";
import { SodaServerError } from "../errors/SodaServerError.js";
import type { SodaTimeoutError } from "../errors/SodaTimeoutError.js";
import { SodaErrorResponse } from "../schemas/SodaErrorResponse.js";

type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

/**
 * Extracts the response body JSON and maps HTTP error status codes to typed
 * SodaError variants. Falls back to a generic SodaServerError when the body
 * cannot be decoded via `SodaErrorResponse`.
 */
export function mapResponseError(
	error: HttpClientError.ResponseError,
	context: {
		readonly domain: string;
		readonly datasetId: string;
		readonly soql?: string;
	},
): Effect.Effect<never, SodaError> {
	const status = error.response.status;

	return Effect.gen(function* () {
		// Try to decode the response body as a SODA error
		const bodyResult = yield* Effect.either(error.response.json);

		let code = "unknown";
		let message = `HTTP ${status}`;
		let data: unknown;

		if (bodyResult._tag === "Right") {
			const decoded = yield* Effect.either(Schema.decodeUnknown(SodaErrorResponse)(bodyResult.right));
			if (decoded._tag === "Right") {
				code = decoded.right.code;
				message = decoded.right.message;
				data = decoded.right.data;
			}
		}

		if (status === 400) {
			return yield* new SodaQueryError({
				code,
				message,
				soql: context.soql ?? "",
				data,
			});
		}

		if (status === 401 || status === 403) {
			return yield* new SodaAuthError({ code, message });
		}

		if (status === 404) {
			return yield* new SodaNotFoundError({
				code,
				message,
				domain: context.domain,
				datasetId: context.datasetId,
			});
		}

		if (status === 429) {
			const retryHeader = error.response.headers["retry-after"];
			const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) * 1000 : 1000;
			return yield* new SodaRateLimitError({ retryAfter: Number.isNaN(retryAfter) ? 1000 : retryAfter });
		}

		return yield* new SodaServerError({ code, message });
	});
}
