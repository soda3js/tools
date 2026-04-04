import type { HttpClient } from "@effect/platform";
import type { SoQLBuilder } from "@soda3js/soql";
import type { Stream } from "effect";
import { Effect } from "effect";
import type { SodaAuthError } from "../errors/SodaAuthError.js";
import type { SodaNotFoundError } from "../errors/SodaNotFoundError.js";
import type { SodaQueryError } from "../errors/SodaQueryError.js";
import type { SodaRateLimitError } from "../errors/SodaRateLimitError.js";
import type { SodaServerError } from "../errors/SodaServerError.js";
import type { SodaTimeoutError } from "../errors/SodaTimeoutError.js";
import type { ApiMode } from "../utils/mode.js";
import { paginateSoda2, paginateSoda3 } from "../utils/pagination.js";

type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

import { queryEndpoint } from "./query.js";

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Paginated query that returns all matching rows as a Stream.
 *
 * Uses offset-based pagination for SODA2 and page-number pagination for SODA3.
 */
export function queryAllEndpoint(
	client: HttpClient.HttpClient,
	domain: string,
	datasetId: string,
	soql: SoQLBuilder,
	mode: ApiMode,
): Effect.Effect<Stream.Stream<Record<string, unknown>, SodaError>> {
	return Effect.succeed(
		mode === "soda2"
			? paginateSoda2<never, SodaError, Record<string, unknown>>({
					pageSize: DEFAULT_PAGE_SIZE,
					fetchPage: (limit, offset) => {
						const paged = soql.limit(limit).offset(offset);
						return queryEndpoint(client, domain, datasetId, paged, mode);
					},
				})
			: paginateSoda3<never, SodaError, Record<string, unknown>>({
					pageSize: DEFAULT_PAGE_SIZE,
					fetchPage: (pageNumber, pageSize) => {
						const paged = soql.limit(pageSize).offset((pageNumber - 1) * pageSize);
						return queryEndpoint(client, domain, datasetId, paged, mode);
					},
				}),
	);
}
