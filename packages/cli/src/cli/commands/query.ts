import { Args, Command, Options } from "@effect/cli";
import { NodeHttpClient } from "@effect/platform-node";
import { SodaClient, SodaClientConfig, SodaClientLive } from "@soda3js/client";
import { Soda3Config } from "@soda3js/config";
import type { SoQLBuilder } from "@soda3js/soql";
import { SoQL } from "@soda3js/soql";
import { Console, Effect, Layer, Option } from "effect";
import { createCache, resolveCacheConfig } from "../../lib/cache-factory.js";
import { resolveDomain } from "../../lib/domain.js";
import type { OutputFormat } from "../../lib/output.js";
import { detectFormat, formatOutput } from "../../lib/output.js";
import { isTTY, renderInk } from "../../ui/render.js";

// ---------------------------------------------------------------------------
// Arguments & Options
// ---------------------------------------------------------------------------

const datasetIdArg = Args.text({ name: "dataset-id" }).pipe(Args.withDescription("Socrata dataset identifier"));

const domainOption = Options.text("domain").pipe(
	Options.withDescription("Socrata domain (e.g. data.cityofnewyork.us)"),
	Options.optional,
);

const profileOption = Options.text("profile").pipe(Options.withDescription("Config profile name"), Options.optional);

const selectOption = Options.text("select").pipe(
	Options.withDescription("Comma-separated column list"),
	Options.optional,
);

const whereOption = Options.text("where").pipe(Options.withDescription("SoQL WHERE expression"), Options.optional);

const limitOption = Options.integer("limit").pipe(
	Options.withDescription("Maximum number of rows to return"),
	Options.optional,
);

const offsetOption = Options.integer("offset").pipe(
	Options.withDescription("Number of rows to skip"),
	Options.optional,
);

const orderOption = Options.text("order").pipe(
	Options.withDescription("Order by column and direction (e.g. created_date:DESC)"),
	Options.optional,
);

const formatOption = Options.choice("format", ["table", "json", "ndjson", "csv"]).pipe(
	Options.withDescription("Output format: table, json, ndjson, csv"),
	Options.optional,
);

const rawSoqlOption = Options.text("q").pipe(
	Options.withDescription("Raw SoQL SELECT expression (bypasses structured options)"),
	Options.optional,
);

const noCacheOption = Options.boolean("no-cache").pipe(
	Options.withDescription("Disable caching for this query"),
	Options.withDefault(false),
);

const cacheTtlOption = Options.integer("cache-ttl").pipe(
	Options.withDescription("Cache TTL in seconds (overrides config)"),
	Options.optional,
);

const groupByOption = Options.text("group-by").pipe(
	Options.withDescription("Comma-separated columns to group by"),
	Options.optional,
);

// ---------------------------------------------------------------------------
// Query options type (exported for testing)
// ---------------------------------------------------------------------------

export interface QueryOptions {
	readonly select?: string;
	readonly where?: string;
	readonly limit?: number;
	readonly offset?: number;
	readonly order?: string;
	readonly q?: string;
	readonly groupBy?: string;
}

// ---------------------------------------------------------------------------
// Query builder helper (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Build a SoQLBuilder from structured CLI options or a raw query string.
 *
 * When `q` is provided, it takes precedence and all structured options
 * are ignored. The raw string is inserted via `SoQL.raw()` as a SELECT
 * expression, allowing arbitrary SoQL to pass through the builder.
 */
export function buildQuery(options: QueryOptions): SoQLBuilder {
	if (options.q !== undefined) {
		return SoQL.query().select(SoQL.raw(options.q));
	}

	let builder = SoQL.query();

	if (options.select !== undefined) {
		const columns = options.select.split(",").map((c) => c.trim());
		const selectArgs = columns.map((col) => (col.includes("(") ? SoQL.raw(col) : col));
		builder = builder.select(...selectArgs);
	}

	if (options.where !== undefined) {
		builder = builder.where(SoQL.raw(options.where));
	}

	if (options.limit !== undefined) {
		builder = builder.limit(options.limit);
	}

	if (options.offset !== undefined) {
		builder = builder.offset(options.offset);
	}

	if (options.order !== undefined) {
		const [col, dir] = options.order.split(":");
		if (col !== undefined) {
			const direction = dir?.toUpperCase() === "DESC" ? "DESC" : "ASC";
			builder = builder.orderBy(col, direction);
		}
	}

	if (options.groupBy !== undefined) {
		const columns = options.groupBy.split(",").map((c) => c.trim());
		builder = builder.groupBy(...columns);
	}

	return builder;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const queryCommand = Command.make(
	"query",
	{
		datasetId: datasetIdArg,
		domain: domainOption,
		profile: profileOption,
		select: selectOption,
		where: whereOption,
		limit: limitOption,
		offset: offsetOption,
		order: orderOption,
		format: formatOption,
		q: rawSoqlOption,
		noCache: noCacheOption,
		cacheTtl: cacheTtlOption,
		groupBy: groupByOption,
	},
	({ datasetId, domain, profile, select, where, limit, offset, order, format, q, noCache, cacheTtl, groupBy }) =>
		Effect.gen(function* () {
			// 1. Read config and resolve domain
			const config = yield* Effect.promise(() => Soda3Config.load());
			const profileName = profile._tag === "Some" ? profile.value : undefined;
			const resolved = resolveDomain(config, {
				...(profileName !== undefined ? { profile: profileName } : {}),
				...(domain._tag === "Some" ? { domain: domain.value } : {}),
			});

			// 2. Build SodaClientConfig from resolved domain
			const profileCache = profileName !== undefined ? config.profiles[profileName]?.cache : undefined;
			const cacheConfig = resolveCacheConfig(config.cache, profileCache, {
				noCache,
				...(Option.isSome(cacheTtl) ? { cacheTtl: cacheTtl.value } : {}),
			});

			const clientConfig = cacheConfig.enabled
				? SodaClientConfig.withCache(
						{
							...(resolved.appToken !== undefined
								? { domains: { [resolved.domain]: { appToken: resolved.appToken } } }
								: {}),
						},
						createCache(),
						cacheConfig.ttl,
					)
				: new SodaClientConfig({
						...(resolved.appToken !== undefined
							? { domains: { [resolved.domain]: { appToken: resolved.appToken } } }
							: {}),
					});

			// 3. Build SoQL query
			const soql = buildQuery({
				...(select._tag === "Some" ? { select: select.value } : {}),
				...(where._tag === "Some" ? { where: where.value } : {}),
				...(limit._tag === "Some" ? { limit: limit.value } : {}),
				...(offset._tag === "Some" ? { offset: offset.value } : {}),
				...(order._tag === "Some" ? { order: order.value } : {}),
				...(q._tag === "Some" ? { q: q.value } : {}),
				...(groupBy._tag === "Some" ? { groupBy: groupBy.value } : {}),
			});

			// 4. Execute query via SodaClient
			const clientLayer = Layer.provide(SodaClientLive(clientConfig), NodeHttpClient.layerUndici);

			const queryEffect = Effect.gen(function* () {
				const client = yield* SodaClient;
				return yield* client.query(resolved.domain, datasetId, soql);
			});

			const rawRows = yield* Effect.provide(queryEffect, clientLayer);
			const rows = rawRows as ReadonlyArray<Record<string, unknown>>;

			// 5. Format and output
			const fmt: OutputFormat = format._tag === "Some" ? format.value : detectFormat(rows.length);
			if (fmt === "table" && isTTY()) {
				const output = yield* renderInk(async (React) => {
					const { Table } = await import("../../ui/Table.js");
					return React.createElement(Table, { data: rows as Record<string, unknown>[] });
				});
				yield* Console.log(output);
			} else {
				const output = formatOutput(rows, fmt);
				yield* Console.log(output);
			}
		}),
).pipe(Command.withDescription("Query a Socrata dataset"));
