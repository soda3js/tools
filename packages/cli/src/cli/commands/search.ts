import { Args, Command, Options } from "@effect/cli";
import { NodeHttpClient } from "@effect/platform-node";
import type { CatalogResponse } from "@soda3js/client";
import { SodaClient, SodaClientConfig, SodaClientLive } from "@soda3js/client";
import { Console, Effect, Layer, Option } from "effect";
import { isTTY, renderInk } from "../../ui/render.js";

// ---------------------------------------------------------------------------
// Arguments & Options
// ---------------------------------------------------------------------------

const queryArg = Args.text({ name: "query" }).pipe(Args.withDescription("Search keywords"), Args.optional);

const domainOption = Options.text("domain").pipe(
	Options.withDescription("Filter results to a specific Socrata domain"),
	Options.optional,
);

const categoryOption = Options.text("category").pipe(
	Options.withDescription("Filter by dataset category"),
	Options.optional,
);

const tagsOption = Options.text("tags").pipe(
	Options.withDescription("Comma-separated tags to filter by"),
	Options.optional,
);

const onlyOption = Options.text("only").pipe(
	Options.withDescription("Filter by asset type (e.g. datasets, maps, calendars)"),
	Options.optional,
);

const limitOption = Options.integer("limit").pipe(
	Options.withDescription("Maximum number of results"),
	Options.optional,
);

const offsetOption = Options.integer("offset").pipe(
	Options.withDescription("Number of results to skip"),
	Options.optional,
);

const formatOption = Options.choice("format", ["table", "json", "ndjson"]).pipe(
	Options.withDescription("Output format: table, json, ndjson"),
	Options.optional,
);

// ---------------------------------------------------------------------------
// Formatters (exported for testing)
// ---------------------------------------------------------------------------

export function formatSearchTable(response: CatalogResponse): string {
	if (response.results.length === 0) return "(no results)";

	const lines: string[] = [];
	lines.push(`Found ${response.resultSetSize} result(s)\n`);

	const rows = response.results.map((r) => ({
		id: r.resource.id,
		name: r.resource.name.length > 60 ? `${r.resource.name.slice(0, 57)}...` : r.resource.name,
		type: r.resource.type,
		domain: r.metadata.domain,
	}));

	const headers = ["id", "name", "type", "domain"] as const;
	const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => r[h].length)));

	const headerLine = headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join("\u2502");
	const separator = widths.map((w) => "\u2500".repeat(w + 2)).join("\u253C");
	const dataLines = rows.map((row) => headers.map((h, i) => ` ${row[h].padEnd(widths[i])} `).join("\u2502"));

	lines.push(headerLine);
	lines.push(separator);
	lines.push(...dataLines);

	return lines.join("\n");
}

export function formatSearchJson(response: CatalogResponse): string {
	return JSON.stringify(response.results, null, 2);
}

export function formatSearchNdjson(response: CatalogResponse): string {
	return response.results.map((r) => JSON.stringify(r)).join("\n");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const searchCommand = Command.make(
	"search",
	{
		query: queryArg,
		domain: domainOption,
		category: categoryOption,
		tags: tagsOption,
		only: onlyOption,
		limit: limitOption,
		offset: offsetOption,
		format: formatOption,
	},
	({ query, domain, category, tags, only, limit, offset, format }) =>
		Effect.gen(function* () {
			const clientConfig = new SodaClientConfig({});
			const clientLayer = Layer.provide(SodaClientLive(clientConfig), NodeHttpClient.layerUndici);

			const searchEffect = Effect.gen(function* () {
				const soda = yield* SodaClient;

				const params = {
					...(Option.isSome(query) ? { q: query.value } : {}),
					...(Option.isSome(domain) ? { domains: [domain.value] } : {}),
					...(Option.isSome(category) ? { categories: [category.value] } : {}),
					...(Option.isSome(tags) ? { tags: tags.value.split(",").map((t) => t.trim()) } : {}),
					...(Option.isSome(only) ? { only: [only.value] } : {}),
					...(Option.isSome(limit) ? { limit: limit.value } : {}),
					...(Option.isSome(offset) ? { offset: offset.value } : {}),
				};

				const response = yield* soda.discover(params);

				const fmt = Option.isSome(format) ? format.value : isTTY() ? "table" : "ndjson";

				let output: string;
				switch (fmt) {
					case "json":
						output = formatSearchJson(response);
						break;
					case "ndjson":
						output = formatSearchNdjson(response);
						break;
					default:
						if (isTTY()) {
							output = yield* renderInk(async (React) => {
								const { SearchResults } = await import("../../ui/SearchResults.js");
								return React.createElement(SearchResults, {
									results: response.results.map((r) => ({
										id: r.resource.id,
										name: r.resource.name,
										description: r.resource.description,
										type: r.resource.type,
										domain: r.metadata.domain,
										permalink: r.permalink,
									})),
									totalCount: response.resultSetSize,
								});
							});
						} else {
							output = formatSearchTable(response);
						}
						break;
				}

				yield* Console.log(output);
			});

			yield* Effect.provide(searchEffect, clientLayer);
		}),
).pipe(Command.withDescription("Search the Socrata dataset catalog"));
