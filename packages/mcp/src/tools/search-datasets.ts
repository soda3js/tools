import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import { z } from "zod";
import { formatTable } from "../lib/format.js";
import type { CatalogService } from "../services/CatalogService.js";
import type { QueryService } from "../services/QueryService.js";

export function registerSearchDatasets(
	server: McpServer,
	runtime: ManagedRuntime.ManagedRuntime<CatalogService | QueryService, never>,
): void {
	server.registerTool(
		"search_datasets",
		{
			description:
				"Search the Socrata open data catalog for datasets matching a query. Returns dataset names, IDs, domains, descriptions, and update timestamps.",
			inputSchema: {
				q: z.string().describe("Search query text"),
				domain: z.optional(z.string()).describe("Filter to a specific Socrata domain (e.g. data.cityofnewyork.us)"),
				category: z.optional(z.string()).describe("Filter by dataset category"),
				limit: z.optional(z.number().min(1).max(50).default(10)).describe("Number of results (1-50, default 10)"),
			},
		},
		async (args) => {
			const { CatalogService } = await import("../services/CatalogService.js");
			const { Effect } = await import("effect");

			const params: import("@soda3js/client").DiscoveryParams = {
				q: args.q,
				limit: Math.min(args.limit ?? 10, 50),
				...(args.domain ? { domains: [args.domain] } : {}),
				...(args.category ? { categories: [args.category] } : {}),
			};

			const result = await runtime.runPromise(
				Effect.gen(function* () {
					const catalog = yield* CatalogService;
					return yield* catalog.search(params);
				}),
			);

			const rows = result.results.map((r) => ({
				name: r.resource.name,
				id: r.resource.id,
				domain: r.metadata.domain,
				type: r.resource.type,
				description: r.resource.description,
				updated: r.resource.updatedAt,
			}));

			return {
				content: [
					{
						type: "text" as const,
						text: formatTable(rows, {
							total_count: result.resultSetSize,
							has_more: rows.length < result.resultSetSize,
						}),
					},
				],
			};
		},
	);
}
