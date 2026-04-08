import { HttpClient, HttpClientRequest } from "@effect/platform";
import type { SoQLBuilder } from "@soda3js/soql";
import type { Stream } from "effect";
import { Context, Effect, Schema } from "effect";
import type { DiscoveryParams } from "../endpoints/discovery.js";
import { discoveryEndpoint } from "../endpoints/discovery.js";
import { exportEndpoint } from "../endpoints/export.js";
import { metadataEndpoint } from "../endpoints/metadata.js";
import { queryEndpoint } from "../endpoints/query.js";
import { queryAllEndpoint } from "../endpoints/query-all.js";
import type { SodaAuthError } from "../errors/SodaAuthError.js";
import type { SodaNotFoundError } from "../errors/SodaNotFoundError.js";
import { SodaParseError } from "../errors/SodaParseError.js";
import type { SodaQueryError } from "../errors/SodaQueryError.js";
import type { SodaRateLimitError } from "../errors/SodaRateLimitError.js";
import { SodaServerError } from "../errors/SodaServerError.js";
import type { SodaTimeoutError } from "../errors/SodaTimeoutError.js";
import type { CatalogResponse } from "../schemas/CatalogResponse.js";
import { cachedMetadata, cachedQuery } from "../utils/cache.js";
import { resolveMode } from "../utils/mode.js";

type SodaError =
	| SodaAuthError
	| SodaQueryError
	| SodaNotFoundError
	| SodaServerError
	| SodaRateLimitError
	| SodaTimeoutError;

import { DatasetMetadata } from "../schemas/DatasetMetadata.js";
import type { SodaClientConfig } from "../schemas/SodaClientConfig.js";

export class SodaClient extends Context.Tag("@soda3js/client/SodaClient")<
	SodaClient,
	{
		readonly query: (
			domain: string,
			datasetId: string,
			soql: SoQLBuilder,
			options?: { schema?: Schema.Schema<unknown, unknown> },
		) => Effect.Effect<ReadonlyArray<unknown>, SodaError | SodaParseError>;
		readonly queryAll: (
			domain: string,
			datasetId: string,
			soql: SoQLBuilder,
		) => Effect.Effect<Stream.Stream<Record<string, unknown>, SodaError>>;
		readonly metadata: (domain: string, datasetId: string) => Effect.Effect<DatasetMetadata, SodaError>;
		readonly export_: (
			domain: string,
			datasetId: string,
			format: "csv" | "json" | "tsv",
		) => Effect.Effect<Stream.Stream<Uint8Array, SodaError>, SodaError>;
		readonly discover: (params: DiscoveryParams) => Effect.Effect<CatalogResponse, SodaError>;
	}
>() {
	/**
	 * Resolves a per-domain app token, preferring domain-specific config over global.
	 */
	static resolveToken(domain: string, config: SodaClientConfig): string | undefined {
		const domainToken = config.domains?.[domain]?.appToken;
		return domainToken ?? config.appToken;
	}

	/**
	 * Builds an authenticated HttpClient for a domain by applying base URL and
	 * optional X-App-Token header to the captured base client instance.
	 */
	static buildClient(
		baseClient: HttpClient.HttpClient,
		domain: string,
		config: SodaClientConfig,
	): HttpClient.HttpClient {
		const baseUrl = `https://${domain}`;
		const token = SodaClient.resolveToken(domain, config);

		let client = HttpClient.mapRequest(baseClient, (request) => HttpClientRequest.prependUrl(request, baseUrl));

		if (token !== undefined) {
			client = HttpClient.mapRequest(client, (request) => HttpClientRequest.setHeader(request, "x-app-token", token));
		}

		return client;
	}

	/**
	 * Creates a SodaClient service implementation wired to the given config.
	 *
	 * Requires an HttpClient in the Effect context (provided at the platform
	 * entry-point level, e.g. via FetchHttpClient or NodeHttpClient).
	 */
	static makeSodaClient(config: SodaClientConfig): Effect.Effect<SodaClient["Type"], never, HttpClient.HttpClient> {
		return Effect.gen(function* () {
			const baseClient = yield* HttpClient.HttpClient;
			const cache = config.cache;
			const cacheTtl = config.cacheTtl ?? 300;

			function resolveModeForDomain(domain: string) {
				const token = SodaClient.resolveToken(domain, config);
				return resolveMode(
					token !== undefined ? { mode: config.mode ?? "auto", appToken: token } : { mode: config.mode ?? "auto" },
				);
			}

			return {
				query: (domain, datasetId, soql, options?) => {
					const client = SodaClient.buildClient(baseClient, domain, config);
					const mode = resolveModeForDomain(domain);
					const baseQuery = queryEndpoint(client, domain, datasetId, soql, mode);

					const resolvedQuery = !cache
						? baseQuery
						: cachedQuery({
								cache,
								ttl: cacheTtl,
								domain,
								datasetId,
								query: soql.toParams(),
								format: "json",
								fetchMetadata: () =>
									metadataEndpoint(client, domain, datasetId).pipe(
										Effect.map((meta) => ({ rowsUpdatedAt: meta.rowsUpdatedAt })),
									),
								fetchData: () => baseQuery,
							}).pipe(
								Effect.catchAll((error) =>
									Effect.fail(
										new SodaServerError({
											code: "cache_error",
											message: error instanceof Error ? error.message : "Cache operation failed",
										}),
									),
								),
							);

					if (!options?.schema) return resolvedQuery;

					const schema = options.schema;
					return resolvedQuery.pipe(
						Effect.flatMap((rows) =>
							Effect.forEach(rows, (row) =>
								Schema.decodeUnknown(schema)(row).pipe(
									Effect.catchTag("ParseError", (e) =>
										Effect.fail(
											new SodaParseError({
												message: "Row failed schema validation",
												errors: e,
											}),
										),
									),
								),
							),
						),
					);
				},

				queryAll: (domain, datasetId, soql) => {
					const client = SodaClient.buildClient(baseClient, domain, config);
					const mode = resolveModeForDomain(domain);
					return queryAllEndpoint(client, domain, datasetId, soql, mode);
				},

				metadata: (domain, datasetId) => {
					const client = SodaClient.buildClient(baseClient, domain, config);
					const baseMetadata = metadataEndpoint(client, domain, datasetId);

					if (!cache) return baseMetadata;

					return cachedMetadata({
						cache,
						ttl: cacheTtl,
						domain,
						datasetId,
						fetchMetadata: () => baseMetadata.pipe(Effect.map((meta) => meta as unknown as Record<string, unknown>)),
					})
						.pipe(
							Effect.catchAll((error) =>
								Effect.fail(
									new SodaServerError({
										code: "cache_error",
										message: error instanceof Error ? error.message : "Cache operation failed",
									}),
								),
							),
						)
						.pipe(
							Effect.flatMap((raw) =>
								Schema.decodeUnknown(DatasetMetadata)(raw).pipe(
									Effect.catchTag("ParseError", () =>
										Effect.fail(
											new SodaServerError({
												code: "cache_error",
												message: "Failed to decode cached metadata",
											}),
										),
									),
								),
							),
						);
				},

				export_: (domain, datasetId, format) => {
					const client = SodaClient.buildClient(baseClient, domain, config);
					return exportEndpoint(client, domain, datasetId, format);
				},

				discover: (params) => {
					return discoveryEndpoint(baseClient, params);
				},
			} satisfies SodaClient["Type"];
		});
	}
}
